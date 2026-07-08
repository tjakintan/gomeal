* * * * *

GoMeal-ML
=========

**GoMeal-ML** is a machine learning-powered backend system designed for a modern food and cooking platform. It leverages vector embeddings and Large Language Models (LLMs) to provide high-quality recipe recommendations and automated metadata generation.

🏗 Project Structure
--------------------

Plaintext

```
GOMEAL-ML/
├─ app/
│  ├─ api/                 # API routes and endpoints
│  ├─ data/                # Data processing and storage
│  │  ├─ generated/        # Generated outputs (embeddings, intermediate files)
│  │  ├─ processed/        # Cleaned and processed datasets
│  │  └─ main.py           # Entry point for local test pipeline
│  ├─ llm/                 # Large language model utilities
│  │  └─ generator.py      # Text or tag generation logic
│  ├─ ml/                  # Machine learning modules
│  │  └─ recommendation.py # Recipe recommendation logic
│  ├─ router/              # Routing logic (API endpoints)
│  ├─ test/                # Test files and caches
│  │  ├─ recipes_embeddings.parquet
│  │  ├─main.py            # Test entry point
│  │  └─ users_embeddings.parquet
│  └─ utils/               # Helper functions
│     ├─ helpers.py      
│     └─ model.py          # Model utility functions
├─ docs/                   # Documentation
├─ venv/                   # Virtual environment
├─ .env                    # Environment variables
├─ requirements.txt        # Python dependencies
└─ README.md               # Project readme

```

* * * * *

⚙️ Setup
--------

1.  **Clone the repository:**

    Bash

    ```
    git clone <repo-url>
    cd gomeal-ml

    ```

2.  **Set up the virtual environment:**

    Bash

    ```
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`

    ```

3. **Replace folder with actual raw dataset with struct in ./app/data**
    ./raw
        /user/{datasetName_size}/*
        /recipe/{datasetName_size}/*

4.  **Install dependencies:**

    Bash

    ```
    pip install -r requirements.txt

    ```

5.  **Configure Environment Variables:** Create a `.env` file in the root directory:

    Code snippet

    ```
    RAW_DIR=path/to/data/raw
    PROCESSED_DIR=path/to/data/processed

    ```

* * * * *

📊 Data Processing
------------------

The core logic resides in `app/data/main.py`. The pipeline performs the following:

-   **Ingestion:** Reads raw recipe and user data.

-   **Vectorization:** Generates high-dimensional embeddings for both recipes and users.

-   **Persistence:** Saves processed data as optimized **Parquet** files:

    -   `recipes_embeddings.parquet`

    -   `users_embeddings.parquet`

> [!TIP] This module uses `app/utils/helpers.py` for performing memory-efficient joins and data cleaning.

* * * * *

🤖 Machine Learning
-------------------

### Embeddings

We represent recipes and user preferences in the same vector space, allowing us to calculate similarity scores efficiently.

### Recommendation Engine (`app/ml/recommendation.py`)

Calculates the distance between user vectors and recipe vectors to suggest the most relevant meals.

### LLM Generation (`app/llm/generator.py`)

Utilizes Large Language Models to automatically enrich recipe data with tags, descriptions, or nutritional insights.

* * * * *

🌐 API
------

The `app/api/` layer serves as the interface between the ML logic and the frontend.

-   **Target:** Provides personalized recommendation endpoints.

-   **Integration:** Connects recipe/user data stores with the recommendation engine to serve real-time requests.

* * * * *

🧪 Testing
----------

We use `pytest` to ensure pipeline integrity.

Bash

```
pytest

```

-   **Coverage:** Validates data transformation, embedding generation, and recommendation logic.

-   **Cache:** Cached embeddings for testing are located in `app/test/processing_test_cache/`.

* * * * *

🛠 Utilities
------------

FilePurpose`helpers.py`Reusable data transformation and cleaning functions.`model.py`Utilities for loading, saving, and versioning ML models.`main.py`CLI entrypoint for batch processing and utility tasks.

Export to Sheets

* * * * *

🤝 Contributing
---------------

1.  Fork the repository.

2.  Create a feature branch: `git checkout -b feature-name`.

3.  Commit your changes: `git commit -m "Add new feature"`.

4.  Push to the branch: `git push origin feature-name`.

5.  Open a **Pull Request**.

* * * * *

📜 License
----------

This project is licensed under the [MIT License](https://www.gomeal.org).

* * * * *