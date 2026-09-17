import unittest

import pandas as pd

from app.services.ml.train import _chronological_split, _regression_metrics


class MlTrainingTests(unittest.TestCase):
    def test_chronological_split_keeps_latest_rows_for_testing(self):
        features = pd.DataFrame({"value": [1, 2, 3, 4, 5]})
        target = pd.Series([10, 20, 30, 40, 50])

        train_x, test_x, train_y, test_y = _chronological_split(features, target)

        self.assertEqual(train_x["value"].tolist(), [1, 2, 3, 4])
        self.assertEqual(test_x["value"].tolist(), [5])
        self.assertEqual(train_y.tolist(), [10, 20, 30, 40])
        self.assertEqual(test_y.tolist(), [50])

    def test_regression_metrics_are_independent_and_complete(self):
        metrics = _regression_metrics(
            pd.Series([1.0, 3.0]),
            pd.Series([2.0, 2.0]),
        )

        self.assertEqual(metrics, {
            "mae": 1.0,
            "rmse": 1.0,
            "r2": 0.0,
            "explained_variance": 0.0,
        })
