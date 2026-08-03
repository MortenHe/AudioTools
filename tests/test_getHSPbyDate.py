import unittest
from datetime import datetime

import getHSPbyDate as script


class GetHSPByDateTests(unittest.TestCase):
    def test_filters_entries_after_explicit_date(self):
        entries = [("A", "2024-01-05"), ("B", "2023-12-31"), ("C", "2024-02-01")]

        filtered = script.filter_entries_by_date(entries, threshold_date=datetime(2024, 1, 1).date())

        self.assertEqual([name for name, _ in filtered], ["A", "C"])

    def test_defaults_to_last_six_months(self):
        entries = [
            ("A", "2024-07-01"),
            ("B", "2024-06-30"),
            ("C", "2023-12-31"),
        ]

        filtered = script.filter_entries_by_date(
            entries,
            reference_date=datetime(2024, 12, 31).date(),
            use_default_threshold=True,
        )

        self.assertEqual([name for name, _ in filtered], ["A", "B"])


if __name__ == "__main__":
    unittest.main()
