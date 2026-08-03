#python .\getHSPbyDate.py
#python getHSPbyDate.py 2024-01-01
#python getHSPbyDate.py 01.01.2024
#python getHSPbyDate.py --months 3 --no_date

# created by chatgpt
import argparse
import json
import os
from datetime import date, datetime

DIRECTORY = r'C:\Users\Martin\Desktop\Nextcloud\Raspi\audio\wap\json\hsp'


def parse_date(value):
    if not value:
        return None

    for fmt in ('%Y-%m-%d', '%d.%m.%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Invalid date: {value}. Use YYYY-MM-DD or DD.MM.YYYY")


def get_default_threshold_date(reference_date=None, months=6):
    ref_date = reference_date or datetime.now().date()
    year = ref_date.year
    month = ref_date.month - months

    while month <= 0:
        month += 12
        year -= 1

    return date(year, month, 1)


def filter_entries_by_date(entries, threshold_date=None, reference_date=None, use_default_threshold=False, months=6):
    if threshold_date is None and use_default_threshold:
        threshold_date = get_default_threshold_date(reference_date=reference_date, months=months)

    if threshold_date is None:
        return entries

    return [entry for entry in entries if parse_date(entry[1]) >= threshold_date]


def load_entries(directory):
    entries = []

    for filename in os.listdir(directory):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(directory, filename)

        with open(filepath, 'r', encoding='utf-8') as file:
            data = json.load(file)

            for item in data:
                name = item.get('name')
                added = item.get('added')

                if name and added:
                    entries.append((name, added))

    return entries


def main():
    parser = argparse.ArgumentParser(description='List HSP entries added after a given date.')
    parser.add_argument('date', nargs='?', help='Only list entries added on or after this date (YYYY-MM-DD or DD.MM.YYYY)')
    parser.add_argument('--months', type=int, default=6, help='How many months back to include when no date is provided (default: 6)')
    parser.add_argument('--no_date', action='store_true', help='Suppress the display of the added date')
    args = parser.parse_args()

    entries = load_entries(DIRECTORY)
    threshold_date = parse_date(args.date) if args.date else None
    filtered_entries = filter_entries_by_date(
        entries,
        threshold_date=threshold_date,
        use_default_threshold=args.date is None,
        months=args.months,
    )

    sorted_entries = sorted(filtered_entries, key=lambda x: parse_date(x[1]), reverse=True)

    for name, added in sorted_entries:
        added_date = parse_date(added).strftime('%d.%m.%Y')
        if args.no_date:
            print(f"- {name}")
        else:
            print(f"- {name} ({added_date})")


if __name__ == '__main__':
    main()
