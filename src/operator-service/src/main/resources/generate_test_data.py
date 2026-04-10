#!/usr/bin/env python3
"""生成全球运营商测试数据"""

import random
from datetime import datetime

# 全球运营商列表
OPERATORS = [
    # 中国
    {"name": "中国移动", "country": "中国", "region": "北京", "type": "5G", "scale": 1.0},
    {"name": "中国联通", "country": "中国", "region": "上海", "type": "5G", "scale": 0.7},
    {"name": "中国电信", "country": "中国", "region": "广州", "type": "5G", "scale": 0.75},
    # 欧洲
    {"name": "Deutsche Telekom", "country": "德国", "region": "Germany", "type": "5G", "scale": 0.85},
    {"name": "Vodafone", "country": "英国", "region": "UK", "type": "5G", "scale": 0.8},
    {"name": "Orange", "country": "法国", "region": "France", "type": "5G", "scale": 0.7},
    {"name": "Telefonica", "country": "西班牙", "region": "Spain", "type": "5G", "scale": 0.65},
    {"name": "BT Group", "country": "英国", "region": "UK", "type": "5G", "scale": 0.5},
    # 亚太
    {"name": "NTT Docomo", "country": "日本", "region": "Japan", "type": "5G", "scale": 0.9},
    {"name": "SoftBank", "country": "日本", "region": "Japan", "type": "5G", "scale": 0.75},
    {"name": "SK Telecom", "country": "韩国", "region": "Korea", "type": "5G", "scale": 0.85},
    {"name": "KT Corporation", "country": "韩国", "region": "Korea", "type": "5G", "scale": 0.7},
    {"name": "Singtel", "country": "新加坡", "region": "Singapore", "type": "5G", "scale": 0.6},
    {"name": "Telstra", "country": "澳大利亚", "region": "Australia", "type": "5G", "scale": 0.65},
    # 美洲
    {"name": "AT&T", "country": "美国", "region": "USA", "type": "5G", "scale": 0.95},
    {"name": "Verizon", "country": "美国", "region": "USA", "type": "5G", "scale": 0.9},
    {"name": "T-Mobile", "country": "美国", "region": "USA", "type": "5G", "scale": 0.85},
    {"name": "Rogers", "country": "加拿大", "region": "Canada", "type": "5G", "scale": 0.6},
    {"name": "Claro", "country": "墨西哥", "region": "Mexico", "type": "5G", "scale": 0.55},
    # 中东/非洲
    {"name": "Etisalat", "country": "阿联酋", "region": "UAE", "type": "5G", "scale": 0.7},
    {"name": "STC", "country": "沙特阿拉伯", "region": "Saudi Arabia", "type": "5G", "scale": 0.65},
    {"name": "MTN", "country": "南非", "region": "South Africa", "type": "5G", "scale": 0.5},
]

# 频段配置
LTE_BANDS = ["700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M"]
NR_BANDS = ["700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M", "3500M", "4900M"]

# 基准站点数（根据规模调整）
BASE_SITES = {
    "700M": 50, "800M": 100, "900M": 200, "1400M": 30, "1800M": 80, "2100M": 60, "2600M": 40,
}
BASE_NR_SITES = {
    "700M": 30, "800M": 50, "900M": 80, "1400M": 20, "1800M": 40, "2100M": 30, "2600M": 25,
    "3500M": 60, "4900M": 35,
}

def generate_site_data(op, data_month, operator_id):
    """生成站点数据"""
    scale = op["scale"]
    lte_sites = []
    nr_sites = []

    # LTE 站点
    for band in LTE_BANDS:
        base = BASE_SITES[band]
        sites = int(base * scale * random.uniform(0.8, 1.2))
        cells = int(sites * random.uniform(2.5, 3.5))
        lte_sites.append((band, sites, cells))

    # NR 站点
    for band in NR_BANDS:
        base = BASE_NR_SITES[band]
        sites = int(base * scale * random.uniform(0.8, 1.2))
        cells = int(sites * random.uniform(2.5, 3.5))
        nr_sites.append((band, sites, cells))

    # 构建 INSERT 语句
    cols = ["operator_id", "data_month"]
    vals = [str(operator_id), f"'{data_month}'"]

    for band, sites, cells in lte_sites:
        cols.append(f"lte_{band}_site")
        cols.append(f"lte_{band}_cell")
        vals.append(str(sites))
        vals.append(str(cells))

    for band, sites, cells in nr_sites:
        cols.append(f"nr_{band}_site")
        cols.append(f"nr_{band}_cell")
        vals.append(str(sites))
        vals.append(str(cells))

    sql = f"INSERT INTO site_info ({', '.join(cols)}) VALUES ({', '.join(vals)});"
    return sql

def generate_indicator_data(op, data_month, operator_id):
    """生成指标数据"""
    scale = op["scale"]

    # LTE 频段指标
    lte_data = {}
    for band in LTE_BANDS:
        dl_rate = round(50 + random.uniform(-10, 50) * scale, 2)
        ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
        dl_prb = round(30 + random.uniform(0, 25) * scale, 2)
        ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
        lte_data[band] = (dl_rate, ul_rate, dl_prb, ul_prb)

    # NR 频段指标
    nr_data = {}
    for band in NR_BANDS:
        dl_rate = round(200 + random.uniform(-50, 300) * scale, 2)
        ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
        dl_prb = round(40 + random.uniform(0, 25) * scale, 2)
        ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
        nr_data[band] = (dl_rate, ul_rate, dl_prb, ul_prb)

    # 汇总指标
    lte_avg_dl = round(sum(d[0] for d in lte_data.values()) / len(lte_data), 2)
    lte_avg_prb = round(sum(d[2] for d in lte_data.values()) / len(lte_data), 2)
    nr_avg_dl = round(sum(d[0] for d in nr_data.values()) / len(nr_data), 2)
    nr_avg_prb = round(sum(d[2] for d in nr_data.values()) / len(nr_data), 2)

    cols = ["operator_id", "data_month"]
    vals = [str(operator_id), f"'{data_month}'"]

    for band in LTE_BANDS:
        dl_rate, ul_rate, dl_prb, ul_prb = lte_data[band]
        cols.extend([f"lte_{band}_dl_rate", f"lte_{band}_ul_rate", f"lte_{band}_dl_prb", f"lte_{band}_ul_prb"])
        vals.extend([str(dl_rate), str(ul_rate), str(dl_prb), str(ul_prb)])

    for band in NR_BANDS:
        dl_rate, ul_rate, dl_prb, ul_prb = nr_data[band]
        cols.extend([f"nr_{band}_dl_rate", f"nr_{band}_ul_rate", f"nr_{band}_dl_prb", f"nr_{band}_ul_prb"])
        vals.extend([str(dl_rate), str(ul_rate), str(dl_prb), str(ul_prb)])

    # 汇总字段
    cols.extend(["lte_avg_dl_rate", "lte_avg_prb", "nr_avg_dl_rate", "nr_avg_prb",
                 "split_ratio", "dwell_ratio", "terminal_penetration", "duration_dwell_ratio", "fallback_ratio"])
    vals.extend([
        str(lte_avg_dl), str(lte_avg_prb), str(nr_avg_dl), str(nr_avg_prb),
        str(round(50 + random.uniform(-20, 30), 2)),
        str(round(80 + random.uniform(-10, 15), 2)),
        str(round(40 + random.uniform(-15, 40), 2)),
        str(round(75 + random.uniform(-10, 15), 2)),
        str(round(10 + random.uniform(-5, 8), 2)),
    ])

    sql = f"INSERT INTO indicator_info ({', '.join(cols)}) VALUES ({', '.join(vals)});"
    return sql

def main():
    random.seed(42)  # 固定随机种子保证可重复

    months = ["2026-01", "2026-02", "2026-03"]

    # Operator INSERT statements
    print("-- 运营商信息")
    print("TRUNCATE TABLE operator_info;")
    print("INSERT INTO operator_info (operator_name, country, region, network_type) VALUES")
    operator_values = []
    for i, op in enumerate(OPERATORS, 1):
        operator_values.append(f"({i}, '{op['name']}', '{op['country']}', '{op['region']}', '{op['type']}')")
    print(",\n".join(operator_values) + ";")
    print()

    # Site and indicator data per month
    for month in months:
        print(f"-- 站点数据 ({month})")
        print(f"INSERT INTO site_info (operator_id, data_month, lte_700M_site, lte_700M_cell, lte_800M_site, lte_800M_cell, lte_900M_site, lte_900M_cell, lte_1400M_site, lte_1400M_cell, lte_1800M_site, lte_1800M_cell, lte_2100M_site, lte_2100M_cell, lte_2600M_site, lte_2600M_cell, nr_700M_site, nr_700M_cell, nr_800M_site, nr_800M_cell, nr_900M_site, nr_900M_cell, nr_1400M_site, nr_1400M_cell, nr_1800M_site, nr_1800M_cell, nr_2100M_site, nr_2100M_cell, nr_2600M_site, nr_2600M_cell, nr_3500M_site, nr_3500M_cell, nr_4900M_site, nr_4900M_cell) VALUES")

        site_rows = []
        for i, op in enumerate(OPERATORS, 1):
            scale = op["scale"]
            lte_vals = []
            nr_vals = []

            for band in LTE_BANDS:
                base = BASE_SITES[band]
                sites = int(base * scale * random.uniform(0.8, 1.2))
                cells = int(sites * random.uniform(2.5, 3.5))
                lte_vals.extend([str(sites), str(cells)])

            for band in NR_BANDS:
                base = BASE_NR_SITES[band]
                sites = int(base * scale * random.uniform(0.8, 1.2))
                cells = int(sites * random.uniform(2.5, 3.5))
                nr_vals.extend([str(sites), str(cells)])

            row = f"({i}, '{month}', {', '.join(lte_vals)}, {', '.join(nr_vals)})"
            site_rows.append(row)

        print(",\n".join(site_rows) + ";")
        print()

        print(f"-- 指标数据 ({month})")
        print(f"INSERT INTO indicator_info (operator_id, data_month, lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb, lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb, lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb, lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb, lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb, lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb, lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb, nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb, nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb, nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb, nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb, nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb, nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb, nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb, nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb, nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb, lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio) VALUES")

        indicator_rows = []
        for i, op in enumerate(OPERATORS, 1):
            scale = op["scale"]
            lte_vals = []
            nr_vals = []

            for band in LTE_BANDS:
                dl_rate = round(50 + random.uniform(-10, 50) * scale, 2)
                ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
                dl_prb = round(30 + random.uniform(0, 25) * scale, 2)
                ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
                lte_vals.extend([str(dl_rate), str(ul_rate), str(dl_prb), str(ul_prb)])

            for band in NR_BANDS:
                dl_rate = round(200 + random.uniform(-50, 300) * scale, 2)
                ul_rate = round(dl_rate * random.uniform(0.15, 0.25), 2)
                dl_prb = round(40 + random.uniform(0, 25) * scale, 2)
                ul_prb = round(dl_prb * random.uniform(0.9, 1.1), 2)
                nr_vals.extend([str(dl_rate), str(ul_rate), str(dl_prb), str(ul_prb)])

            lte_avg_dl = round(sum(float(lte_vals[j]) for j in range(0, len(lte_vals), 4)) / len(LTE_BANDS), 2)
            lte_avg_prb = round(sum(float(lte_vals[j+2]) for j in range(0, len(lte_vals), 4)) / len(LTE_BANDS), 2)
            nr_avg_dl = round(sum(float(nr_vals[j]) for j in range(0, len(nr_vals), 4)) / len(NR_BANDS), 2)
            nr_avg_prb = round(sum(float(nr_vals[j+2]) for j in range(0, len(nr_vals), 4)) / len(NR_BANDS), 2)

            summary = [
                str(lte_avg_dl), str(lte_avg_prb), str(nr_avg_dl), str(nr_avg_prb),
                str(round(50 + random.uniform(-20, 30), 2)),
                str(round(80 + random.uniform(-10, 15), 2)),
                str(round(40 + random.uniform(-15, 40), 2)),
                str(round(75 + random.uniform(-10, 15), 2)),
                str(round(10 + random.uniform(-5, 8), 2)),
            ]

            row = f"({i}, '{month}', {', '.join(lte_vals)}, {', '.join(nr_vals)}, {', '.join(summary)})"
            indicator_rows.append(row)

        print(",\n".join(indicator_rows) + ";")
        print()

if __name__ == "__main__":
    main()
