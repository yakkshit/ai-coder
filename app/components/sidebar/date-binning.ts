import { format, isAfter, isThisWeek, isThisYear, isToday, isYesterday, subDays } from 'date-fns';
import type { ChatHistoryItem } from '~/lib/persistence';

type Bin = { category: string; items: ChatHistoryItem[] };

export function binDates(_list: ChatHistoryItem[]) {
  const list = _list.toSorted((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const binLookup: Record<string, Bin> = {};
  const bins: Array<Bin> = [];

  list.forEach((item) => {
    const category = dateCategory(new Date(item.timestamp));

    if (!(category in binLookup)) {
      const bin = {
        category,
        items: [item],
      };

      binLookup[category] = bin;

      bins.push(bin);
    } else {
      binLookup[category].items.push(item);
    }
  });

  return bins;
}

function dateCategory(date: Date) {
  if (isToday(date)) {
    return '🟢 Today';
  }

  if (isYesterday(date)) {
    return '🟡 Yesterday';
  }

  if (isThisWeek(date)) {
    // Add day name with emoji
    return `📅 ${format(date, 'EEEE')}`;
  }

  const thirtyDaysAgo = subDays(new Date(), 30);

  if (isAfter(date, thirtyDaysAgo)) {
    return '📆 Past 30 Days';
  }

  if (isThisYear(date)) {
    // Full month name for better readability
    return `🗓️ ${format(date, 'MMMM')}`;
  }

  // Full month and year for better readability
  return `📚 ${format(date, 'MMMM yyyy')}`;
}
