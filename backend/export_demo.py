import json
from data import dataset

if __name__ == "__main__":
    print(json.dumps(dataset(), indent=2))
