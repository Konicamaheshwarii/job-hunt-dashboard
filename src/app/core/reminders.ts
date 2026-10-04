import { Application, DAY, daysBetween, enteredAt, lastActivity, ymd } from './models';

export type ReminderKind = 'follow-up' | 'update' | 'thank-you' | 'prepare' | 'offer' | 'next-action' | 'wishlist';

export interface Reminder {
  id: string;
  appId: string;
  kind: ReminderKind;
  title: string;
  detail: string;
  /** YYYY-MM-DD the reminder is due. */
  due: string;
  overdue: boolean;
}

export interface ReminderRules {
  /** Days after applying (or the last follow-up) with no reply before suggesting a follow-up. */
  followUpDays: number;
  /** After this many quiet days the ghosted detector takes over and follow-ups stop. */
  ghostDays: number;
}

const ms = (d: string) => new Date(d).getTime();

/** Suggested next steps for every application, earliest due first. */
export function reminders(apps: Application[], rules: ReminderRules, now = Date.now()): Reminder[] {
  const today = ymd(now);
  const out: Reminder[] = [];
  const add = (app: Application, kind: ReminderKind, title: string, detail: string, dueAt: number) => {
    const due = ymd(dueAt);
    out.push({ id: `${app.id}:${kind}`, appId: app.id, kind, title, detail, due, overdue: due < today });
  };

  for (const app of apps) {
    const at = `${app.role} at ${app.company}`;
    const upcoming = app.interviews.filter((i) => ms(i.date) > now).sort((a, b) => ms(a.date) - ms(b.date));
    const past = app.interviews.filter((i) => ms(i.date) <= now).sort((a, b) => ms(b.date) - ms(a.date));
    const quiet = daysBetween(lastActivity(app, now), now);

    // Your own next action always shows once it is due.
    if (app.nextAction && app.nextActionDate && app.nextActionDate <= today) {
      add(app, 'next-action', app.nextAction, at, new Date(`${app.nextActionDate}T09:00:00`).getTime());
    }

    // Interview within the next two days: prepare.
    if (upcoming[0] && ms(upcoming[0].date) - now <= 2 * DAY) {
      add(app, 'prepare', `Prepare for the ${upcoming[0].kind.toLowerCase()} interview`, at, ms(upcoming[0].date) - DAY);
    }

    // Interview in the last two days and nothing has moved since: say thanks.
    const lastChange = app.history.length ? ms(app.history[app.history.length - 1].date) : 0;
    if (past[0] && now - ms(past[0].date) <= 2 * DAY && lastChange < ms(past[0].date)
        && !(app.lastContacted && ms(app.lastContacted) > ms(past[0].date))) {
      add(app, 'thank-you', 'Send a thank-you note', `${past[0].kind} interview, ${at}`, ms(past[0].date) + DAY);
    }

    if (app.status === 'applied') {
      const applied = enteredAt(app, 'applied') ?? app.createdAt;
      const since = app.lastContacted && ms(app.lastContacted) > ms(applied) ? app.lastContacted : applied;
      const days = daysBetween(since, now);
      if (days >= rules.followUpDays && quiet < rules.ghostDays) {
        const second = since !== applied;
        add(app, 'follow-up', second ? 'Send a second follow-up' : 'Follow up on your application',
          `No reply ${days} days after ${second ? 'your last follow-up' : 'applying'}: ${at}`, ms(since) + rules.followUpDays * DAY);
      }
    }

    if ((app.status === 'screening' || app.status === 'interview') && !upcoming.length
        && quiet >= rules.followUpDays && quiet < rules.ghostDays) {
      add(app, 'update', 'Ask for an update', `Quiet for ${quiet} days since the last step: ${at}`,
        ms(lastActivity(app, now)) + rules.followUpDays * DAY);
    }

    if (app.status === 'offer') {
      const offered = enteredAt(app, 'offer') ?? app.updatedAt;
      if (daysBetween(offered, now) >= 3) add(app, 'offer', 'Respond to the offer', `Offer received ${daysBetween(offered, now)} days ago: ${at}`, ms(offered) + 3 * DAY);
    }

    if (app.status === 'wishlist') {
      const saved = enteredAt(app, 'wishlist') ?? app.createdAt;
      if (daysBetween(saved, now) >= 14) add(app, 'wishlist', 'Apply or drop it', `On your wishlist for ${daysBetween(saved, now)} days: ${at}`, ms(saved) + 14 * DAY);
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}
