import { Pipe, PipeTransform } from '@angular/core';
import { Application, Status, daysBetween, statusLabel } from '../core/models';

export function salaryRange(app: Pick<Application, 'salaryMin' | 'salaryMax' | 'currency'>): string {
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const sym = app.currency === 'USD' ? '$' : app.currency === 'EUR' ? '€' : app.currency === 'GBP' ? '£' : app.currency === 'INR' ? '₹' : '';
  const unit = (n: number) => (sym ? `${sym}${k(n)}` : `${k(n)} ${app.currency}`);
  if (app.salaryMin && app.salaryMax) return `${unit(app.salaryMin)}–${sym ? k(app.salaryMax) : unit(app.salaryMax)}`;
  if (app.salaryMin) return `${unit(app.salaryMin)}+`;
  if (app.salaryMax) return `up to ${unit(app.salaryMax)}`;
  return '';
}

export function relativeDays(date: string | undefined, now = Date.now()): string {
  if (!date) return '';
  const d = daysBetween(new Date(date).setHours(0, 0, 0, 0), new Date(now).setHours(0, 0, 0, 0));
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d === -1) return 'tomorrow';
  return d > 0 ? `${d} days ago` : `in ${-d} days`;
}

@Pipe({ name: 'ago' })
export class AgoPipe implements PipeTransform {
  transform(date: string | undefined): string {
    return relativeDays(date);
  }
}

@Pipe({ name: 'salary' })
export class SalaryPipe implements PipeTransform {
  transform(app: Pick<Application, 'salaryMin' | 'salaryMax' | 'currency'>): string {
    return salaryRange(app);
  }
}

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(s: Status): string {
    return statusLabel(s);
  }
}

export const percent = (x: number) => `${Math.round(x * 100)}%`;
