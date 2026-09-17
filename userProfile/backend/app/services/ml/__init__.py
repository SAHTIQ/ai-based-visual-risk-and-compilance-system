"""
Simple, educational ML pipeline for userProfile.

This package intentionally follows a plain, easy-to-read structure so a
developer can trace the whole flow end to end:

    dataset (CSV)
        -> data_loader.py   (load raw rows)
        -> preprocessing.py (clean + build X / y)
        -> train.py         (train_test_split -> model.fit -> evaluate -> joblib.dump)
        -> predict.py       (joblib.load -> model.predict, used by FastAPI)

Run `python -m app.services.ml.train` from the backend/ folder to (re)train
all models. FastAPI never calls `.fit()` at request time - it only loads the
already-trained `.joblib` files and calls `.predict()`.
"""
