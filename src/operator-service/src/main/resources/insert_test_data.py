#!/usr/bin/env python3
"""Insert global operator test data into database"""
import pymysql
import random

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'test',
    'password': 'test',
    'database': 'operator_db',
    'charset': 'utf8mb4'
}

# Global operators
OPERATORS = [
    {"Name": "中国移动", "country": "中国", "region": "北京", "type": "5G", "scale": 1.0},
    {"Name": "中国联通", "country": "中国", "region": "上海", "type": "5G", "scale": 0.7},
    {"Name": "中国电信", "country": "中国", "region": "广州", "type": "5G", "scale": 0.75},
    {"Name": "Deutsche Telekom", "country": "德国", "region": "Germany", "type": "5G", "scale": 0.85},
    {"Name": "Vodafone", "country": "英国", "region": "UK", "type": "5G", "scale": 0.8},
    {"Name": "Orange", "country": "法国", "region": "France", "type": "5G", "scale": 0.7},
    {"Name": "Telefonica", "country": "西班牙", "region": "Spain", "type": "5G", "scale": 0.65},
    {"Name": "BT Group", "country": "英国", "region": "UK", "type": "5G", "scale": 0.5},
    {"Name": "NTT Docomo", "country": "日本", "region": "Japan", "type": "5G", "scale": 0.9},
    {"Name": "SoftBank", "country": "日本", "region": "Japan", "type": "5G", "scale": 0.75},
    {"Name": "SK Telecom", "country": "韩国", "region": "Korea", "type": "5G", "scale": 0.85},
    {"Name": "KT Corporation", "country": "韩国", "region": "Korea", "type": "5G", "scale": 0.7},
    {"Name": "Singtel", "country": "新加坡", "region": "Singapore", "type": "5G", "scale": 0.6},
    {"Name": "Telstra", "country": "澳大利亚", "region": "Australia", "type": "5G", "scale": 0.65},
    {"Name": "AT&T", "country": "美国", "region": "USA", "type": "5G", "scale": 0.95},
    {"Name": "Verizon", "country": "美国", "region": "USA", "type": "5G", "scale": 0.9},
    {"Name": "T-Mobile", "country": "美国", "region": "USA", "type": "5G", "scale": 0.85},
    {"Name": "Rogers", "country": "加拿大", "region": "Canada", "type": "5G", "scale": 0.6},
    {"Name": "Claro", "country": "墨西哥", "region": "Mexico", "type": "5G", "scale": 0.55},
    {"Name": "Etisalat", "country": "阿联酋", "region": "UAE", "type": "5G", "scale": 0.7},
    {"Name": "STC", "country": "沙特阿拉伯", "region": "Saudi Arabia", "type": "5G", "scale": 0.65},
    {"Name": "MTN", "country": "南非", "region": "South Africa", "type": "5G", "scale": 0.5},
]

LTE_BANDS = ["700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M"]
NR_BANDS = ["700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M", "3500M", "4900M"]

BASE_SITES = {
    "700M": 50, "800M": 100, "900M": 200, "1400M": 30, "1800M": 80, "2100M": 60, "2600M": 40,
}
BASE_NR_SITES = {
    "700M": 30, "800M": 50, "900M": 80, "1400M": 20, "1800M": 40, "2100M": 30, "2600M": 25,
    "3500M": 60, "4900M": 35,
}

random.seed(42)

def generate_site_data(op_idx, month, scale):
    """Generate site data for one operator/month"""
    lte = {}
    for band in LTE_BANDS:
        base = BASE_SITES[band]
        sites = int(base * scale * random.uniform(0.8, 1.2))
        cells = int(sites * random.uniform(2.5, 3.5))
        lte[band] = (sites, cells)

    nr = {}
    for band in NR_BANDS:
        base = BASE_NR_SITES[band]
        sites = int(base * scale * random.uniform(0.8, 1.2))
        cells = int(sites * random.uniform(2.5, 3.5))
        nr[band] = (sites, cells)

    return lte, nr

def generate_indicator_data(op_idx, month, scale):
    """Generate indicator data for one operator/month"""
    lte = {}
    for band in LTE_BANDS:
        dl_rate = round(50 + random.uniform(-10, 50) * scale, 2)
        ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
        dl_prb = round(30 + random.uniform(0, 25) * scale, 2)
        ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
        lte[band] = (dl_rate, ul_rate, dl_prb, ul_prb)

    nr = {}
    for band in NR_BANDS:
        dl_rate = round(200 + random.uniform(-50, 300) * scale, 2)
        ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
        dl_prb = round(40 + random.uniform(0, 25) * scale, 2)
        ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
        nr[band] = (dl_rate, ul_rate, dl_prb, ul_prb)

    # Summary
    lte_avg_dl = round(sum(v[0] for v in lte.values()) / len(lte), 2)
    lte_avg_prb = round(sum(v[2] for v in lte.values()) / len(lte), 2)
    nr_avg_dl = round(sum(v[0] for v in nr.values()) / len(nr), 2)
    nr_avg_prb = round(sum(v[2] for v in nr.values()) / len(nr), 2)

    return lte, nr, lte_avg_dl, lte_avg_prb, nr_avg_dl, nr_avg_prb

def main():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    months = ["2026-01", "2026-02", "2026-03"]

    try:
        # Clear existing data
        print("Clearing existing data...")
        cursor.execute("SET FOREIGN_KEY_CHECKS=0")
        cursor.execute("TRUNCATE TABLE indicator_info")
        cursor.execute("TRUNCATE TABLE site_info")
        cursor.execute("TRUNCATE TABLE operator_info")
        cursor.execute("SET FOREIGN_KEY_CHECKS=1")

        # Insert operators
        print("Inserting operators...")
        for i, op in enumerate(OPERATORS, 1):
            sql = """INSERT INTO operator_info (operator_name, country, region, network_type)
                     VALUES (%s, %s, %s, %s)"""
            cursor.execute(sql, (op["Name"], op["country"], op["region"], op["type"]))
            print(f"  Inserted: {op['Name']}")

        conn.commit()

        # Insert site and indicator data
        for month in months:
            print(f"\nInserting data for {month}...")

            for i, op in enumerate(OPERATORS, 1):
                scale = op["scale"]

                # Site data
                lte, nr = generate_site_data(i, month, scale)
                site_cols = ["operator_id", "data_month"]
                site_vals = [i, month]
                for band in LTE_BANDS:
                    site_cols.extend([f"lte_{band}_site", f"lte_{band}_cell"])
                    site_vals.extend([lte[band][0], lte[band][1]])
                for band in NR_BANDS:
                    site_cols.extend([f"nr_{band}_site", f"nr_{band}_cell"])
                    site_vals.extend([nr[band][0], nr[band][1]])

                placeholders = ", ".join(["%s"] * len(site_vals))
                sql = f"INSERT INTO site_info ({', '.join(site_cols)}) VALUES ({placeholders})"
                cursor.execute(sql, site_vals)

                # Indicator data
                lte_ind, nr_ind, lte_avg_dl, lte_avg_prb, nr_avg_dl, nr_avg_prb = generate_indicator_data(i, month, scale)
                ind_cols = ["operator_id", "data_month"]
                ind_vals = [i, month]
                for band in LTE_BANDS:
                    ind_cols.extend([f"lte_{band}_dl_rate", f"lte_{band}_ul_rate", f"lte_{band}_dl_prb", f"lte_{band}_ul_prb"])
                    ind_vals.extend(list(lte_ind[band]))
                for band in NR_BANDS:
                    ind_cols.extend([f"nr_{band}_dl_rate", f"nr_{band}_ul_rate", f"nr_{band}_dl_prb", f"nr_{band}_ul_prb"])
                    ind_vals.extend(list(nr_ind[band]))

                # Summary fields
                ind_cols.extend(["lte_avg_dl_rate", "lte_avg_prb", "nr_avg_dl_rate", "nr_avg_prb",
                                "split_ratio", "dwell_ratio", "terminal_penetration", "duration_dwell_ratio", "fallback_ratio"])
                ind_vals.extend([
                    lte_avg_dl, lte_avg_prb, nr_avg_dl, nr_avg_prb,
                    round(50 + random.uniform(-20, 30), 2),
                    round(80 + random.uniform(-10, 15), 2),
                    round(40 + random.uniform(-15, 40), 2),
                    round(75 + random.uniform(-10, 15), 2),
                    round(10 + random.uniform(-5, 8), 2),
                ])

                placeholders = ", ".join(["%s"] * len(ind_vals))
                sql = f"INSERT INTO indicator_info ({', '.join(ind_cols)}) VALUES ({placeholders})"
                cursor.execute(sql, ind_vals)

                print(f"  {op['Name']}: site + indicator inserted")

            conn.commit()

        # Verify
        cursor.execute("SELECT COUNT(*) FROM operator_info")
        op_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM site_info")
        site_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM indicator_info")
        ind_count = cursor.fetchone()[0]

        print(f"\n=== Data Inserted ===")
        print(f"Operators: {op_count}")
        print(f"Site records: {site_count}")
        print(f"Indicator records: {ind_count}")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
