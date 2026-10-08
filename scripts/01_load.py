"""CSV'leri DuckDB'ye alır; her dönemi `period` kolonuyla etiketler."""
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
DB = ROOT / "data" / "processed" / "pos.duckdb"


def main() -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB))
    con.execute("DROP TABLE IF EXISTS transactions")
    con.execute("DROP TABLE IF EXISTS operator_logs")

    con.execute(
        f"""
        CREATE TABLE transactions AS
        SELECT *,
               regexp_extract(filename, '(\\d{{8}}-\\d{{8}})', 1) AS period
        FROM read_csv('{RAW}/POS_transactions_*.csv', filename = true, header = true)
        """
    )
    con.execute(
        f"""
        CREATE TABLE operator_logs AS
        SELECT *,
               regexp_extract(filename, '(\\d{{8}}-\\d{{8}})', 1) AS period
        FROM read_csv('{RAW}/POS_operator_logs_*.csv', filename = true, header = true)
        """
    )
    for table in ("transactions", "operator_logs"):
        n = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        print(f"{table}: {n:,} satır")
    print(con.execute("DESCRIBE transactions").df()[["column_name", "column_type"]])
    print(
        con.execute(
            "SELECT period, count(*) n, min(BeginDateTime) ilk, max(BeginDateTime) son "
            "FROM transactions GROUP BY period ORDER BY period"
        ).df()
    )


if __name__ == "__main__":
    main()
