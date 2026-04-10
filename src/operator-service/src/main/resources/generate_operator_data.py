#!/usr/bin/env python3
"""
生成全球运营商测试数据
按华为区域划分: 亚太、欧洲、美洲、中东、非洲(北非、南非)
"""

import random
import os

# 运营商数据定义
OPERATORS = {
    # 亚太 - 43个
    '亚太': [
        ('中国移动', '中国'), ('中国电信', '中国'), ('中国联通', '中国'), ('中国铁塔', '中国'),
        ('NTT DOCOMO', '日本'), ('软银', '日本'), ('KDDI', '日本'),
        ('KT Corporation', '韩国'), ('SK电讯', '韩国'), ('LG Uplus', '韩国'),
        ('Singtel', '新加坡'), ('StarHub', '新加坡'), ('M1 Limited', '新加坡'),
        ('AIS', '泰国'), ('True Corporation', '泰国'), ('DTAC', '泰国'),
        ('Globe Telecom', '菲律宾'), ('Smart Communications', '菲律宾'),
        ('Celcom', '马来西亚'), ('Digi.com', '马来西亚'),
        ('Telkom Indonesia', '印度尼西亚'), ('Indosat Ooredoo Hutchison', '印度尼西亚'), ('XL Axiata', '印度尼西亚'),
        ('Viettel Group', '越南'), ('VNPT', '越南'), ('Mobifone', '越南'),
        ('Bharti Airtel', '印度'), ('BSNL', '印度'), ('Reliance Jio', '印度'), ('Vodafone Idea', '印度'),
        ('Telenor Pakistan', '巴基斯坦'), ('Jazz', '巴基斯坦'),
        ('Grameenphone', '孟加拉国'), ('Robi Axiata', '孟加拉国'),
        ('Telstra', '澳大利亚'), ('Optus', '澳大利亚'), ('TPG Telecom', '澳大利亚'),
        ('Spark New Zealand', '新西兰'), ('Vodafone New Zealand', '新西兰'),
    ],
    # 欧洲 - 40个
    '欧洲': [
        ('Deutsche Telekom', '德国'), ('Vodafone Germany', '德国'), ('O2 Germany', '德国'),
        ('Telefonica', '西班牙'), ('Vodafone Spain', '西班牙'), ('Orange Spain', '西班牙'),
        ('Orange France', '法国'), ('SFR', '法国'), ('Bouygues Telecom', '法国'),
        ('TIM', '意大利'), ('Vodafone Italy', '意大利'), ('Wind Tre', '意大利'),
        ('BT Group', '英国'), ('Vodafone UK', '英国'), ('O2 UK', '英国'), ('EE', '英国'), ('Three UK', '英国'),
        ('KPN', '荷兰'), ('Vodafone Netherlands', '荷兰'),
        ('Proximus', '比利时'), ('Orange Belgium', '比利时'),
        ('Swisscom', '瑞士'), ('Sunrise Communications', '瑞士'),
        ('A1 Telekom Austria', '奥地利'),
        ('MTS', '俄罗斯'), ('Beeline', '俄罗斯'), ('MegaFon', '俄罗斯'), ('Tele2 Russia', '俄罗斯'),
        ('Play', '波兰'), ('Orange Polska', '波兰'), ('T-Mobile Polska', '波兰'),
        ('O2 Czech Republic', '捷克'), ('T-Mobile Czech Republic', '捷克'),
        ('Magyar Telekom', '匈牙利'),
        ('Orange Romania', '罗马尼亚'), ('Vodafone Romania', '罗马尼亚'),
        ('Turkcell', '土耳其'), ('Turk Telekom', '土耳其'), ('Vodafone Turkey', '土耳其'),
        ('Kyivstar', '乌克兰'), ('Vodafone Ukraine', '乌克兰'),
    ],
    # 美洲 - 33个
    '美洲': [
        ('AT&T', '美国'), ('Verizon Communications', '美国'), ('T-Mobile US', '美国'), ('Sprint', '美国'), ('US Cellular', '美国'),
        ('Bell Canada', '加拿大'), ('Rogers Communications', '加拿大'), ('Telus', '加拿大'), ('Videotron', '加拿大'),
        ('Telcel', '墨西哥'), ('AT&T Mexico', '墨西哥'), ('Movistar Mexico', '墨西哥'),
        ('Vivo', '巴西'), ('Claro Brazil', '巴西'), ('TIM Brasil', '巴西'), ('Oi', '巴西'),
        ('Claro Argentina', '阿根廷'), ('Movistar Argentina', '阿根廷'), ('Personal', '阿根廷'),
        ('Entel Chile', '智利'), ('Claro Chile', '智利'), ('WOM Chile', '智利'),
        ('Claro Colombia', '哥伦比亚'), ('Movistar Colombia', '哥伦比亚'), ('Tigo Colombia', '哥伦比亚'),
        ('Claro Peru', '秘鲁'), ('Entel Peru', '秘鲁'), ('Movistar Peru', '秘鲁'),
        ('Claro Ecuador', '厄瓜多尔'), ('Movilnet', '委内瑞拉'), ('CNT', '厄瓜多尔'), ('Conecel', '厄瓜多尔'), ('Bitel', '秘鲁'),
    ],
    # 中东 - 25个
    '中东': [
        ('Etisalat UAE', '阿联酋'), ('du', '阿联酋'),
        ('STC', '沙特阿拉伯'), ('Mobily', '沙特阿拉伯'), ('Zain Saudi Arabia', '沙特阿拉伯'),
        ('Ooredoo Qatar', '卡塔尔'), ('Vodafone Qatar', '卡塔尔'),
        ('Zain Kuwait', '科威特'), ('Ooredoo Kuwait', '科威特'),
        ('Batelco', '巴林'),
        ('Omantel', '阿曼'), ('Ooredoo Oman', '阿曼'),
        ('Cellcom Israel', '以色列'), ('Partner Communications', '以色列'), ('Pelephone', '以色列'),
        ('MCI', '伊朗'), ('Irancell', '伊朗'),
        ('Zain Iraq', '伊拉克'), ('Asiacell', '伊拉克'), ('Korek Telecom', '伊拉克'),
        ('Zain Jordan', '约旦'), ('Orange Jordan', '约旦'),
        ('Alfa', '黎巴嫩'), ('Touch', '黎巴嫩'),
    ],
    # 非洲-北非 - 13个
    '非洲-北非': [
        ('Orange Egypt', '埃及'), ('Vodafone Egypt', '埃及'), ('Etisalat Misr', '埃及'), ('WE', '埃及'),
        ('Maroc Telecom', '摩洛哥'), ('Orange Morocco', '摩洛哥'), ('inwi', '摩洛哥'),
        ('Djezzy', '阿尔及利亚'), ('Ooredoo Algeria', '阿尔及利亚'), ('Mobilis', '阿尔及利亚'),
        ('Orange Tunisia', '突尼斯'), ('Tunisiana', '突尼斯'),
        ('Libya Tel', '利比亚'),
    ],
    # 非洲-南非 - 26个
    '非洲-南非': [
        ('MTN South Africa', '南非'), ('Vodacom', '南非'), ('Cell C', '南非'),
        ('MTN Nigeria', '尼日利亚'), ('Airtel Nigeria', '尼日利亚'), ('Globacom', '尼日利亚'),
        ('Safaricom', '肯尼亚'), ('Airtel Kenya', '肯尼亚'), ('Telekom Kenya', '肯尼亚'),
        ('Ethio Telecom', '埃塞俄比亚'),
        ('Vodacom Tanzania', '坦桑尼亚'), ('Airtel Tanzania', '坦桑尼亚'), ('Tigo Tanzania', '坦桑尼亚'),
        ('MTN Uganda', '乌干达'), ('Airtel Uganda', '乌干达'),
        ('MTN Ghana', '加纳'), ('Vodafone Ghana', '加纳'), ('AirtelTigo', '加纳'),
        ('MTN Ivory Coast', '科特迪瓦'), ('Orange Ivory Coast', '科特迪瓦'),
        ('Orange Senegal', '塞内加尔'), ('Tigo Senegal', '塞内加尔'),
        ('MTN Cameroon', '喀麦隆'), ('Orange Cameroon', '喀麦隆'),
        ('Airtel DRC', '刚果民主共和国'), ('Vodacom DRC', '刚果民主共和国'),
    ],
}

# 区域规模系数（用于生成差异化的站点数据）
REGION_SCALE = {
    '亚太': 1.0,      # 中国、日本、韩国等大国规模
    '欧洲': 0.8,      # 欧洲运营商规模稍小
    '美洲': 0.9,      # 美国运营商规模大
    '中东': 0.5,      # 中东运营商规模较小
    '非洲-北非': 0.4, # 北非运营商规模较小
    '非洲-南非': 0.3, # 南非运营商规模较小
}

def generate_site_data(operator_idx, region, month):
    """生成站点数据"""
    scale = REGION_SCALE.get(region, 0.5)
    random.seed(operator_idx * 100 + hash(month) % 1000)

    def r(base, variance):
        return max(0, int(base * scale + random.randint(-variance, variance)))

    # LTE 站点
    lte_700M_site = r(30, 15)
    lte_800M_site = r(50, 20)
    lte_900M_site = r(100, 30)
    lte_1400M_site = r(25, 10)
    lte_1800M_site = r(80, 25)
    lte_2100M_site = r(60, 20)
    lte_2600M_site = r(70, 25)

    # NR 站点
    nr_700M_site = r(20, 10)
    nr_800M_site = r(15, 8)
    nr_900M_site = r(30, 15)
    nr_1400M_site = r(10, 5)
    nr_1800M_site = r(25, 12)
    nr_2100M_site = r(20, 10)
    nr_2600M_site = r(50, 20)
    nr_3500M_site = r(80, 30)
    nr_4900M_site = r(20, 10)
    nr_2300M_site = r(40, 15)

    # 小区数 = 站点数 * 平均站址配置系数
    cell_factor = random.uniform(2.5, 3.5)
    lte_700M_cell = int(lte_700M_site * cell_factor)
    lte_800M_cell = int(lte_800M_site * cell_factor)
    lte_900M_cell = int(lte_900M_site * cell_factor)
    lte_1400M_cell = int(lte_1400M_site * cell_factor)
    lte_1800M_cell = int(lte_1800M_site * cell_factor)
    lte_2100M_cell = int(lte_2100M_site * cell_factor)
    lte_2600M_cell = int(lte_2600M_site * cell_factor)

    nr_700M_cell = int(nr_700M_site * cell_factor)
    nr_800M_cell = int(nr_800M_site * cell_factor)
    nr_900M_cell = int(nr_900M_site * cell_factor)
    nr_1400M_cell = int(nr_1400M_site * cell_factor)
    nr_1800M_cell = int(nr_1800M_site * cell_factor)
    nr_2100M_cell = int(nr_2100M_site * cell_factor)
    nr_2600M_cell = int(nr_2600M_site * cell_factor)
    nr_3500M_cell = int(nr_3500M_site * cell_factor)
    nr_4900M_cell = int(nr_4900M_site * cell_factor)
    nr_2300M_cell = int(nr_2300M_site * cell_factor)

    lte_total = lte_700M_site + lte_800M_site + lte_900M_site + lte_1400M_site + lte_1800M_site + lte_2100M_site + lte_2600M_site
    nr_total = nr_700M_site + nr_800M_site + nr_900M_site + nr_1400M_site + nr_1800M_site + nr_2100M_site + nr_2600M_site + nr_3500M_site + nr_4900M_site + nr_2300M_site

    return (
        lte_700M_site, lte_700M_cell,
        lte_800M_site, lte_800M_cell,
        lte_900M_site, lte_900M_cell,
        lte_1400M_site, lte_1400M_cell,
        lte_1800M_site, lte_1800M_cell,
        lte_2100M_site, lte_2100M_cell,
        lte_2600M_site, lte_2600M_cell,
        nr_700M_site, nr_700M_cell,
        nr_800M_site, nr_800M_cell,
        nr_900M_site, nr_900M_cell,
        nr_1400M_site, nr_1400M_cell,
        nr_1800M_site, nr_1800M_cell,
        nr_2100M_site, nr_2100M_cell,
        nr_2600M_site, nr_2600M_cell,
        nr_3500M_site, nr_3500M_cell,
        nr_4900M_site, nr_4900M_cell,
        nr_2300M_site, nr_2300M_cell,
        lte_total, nr_total
    )

def generate_indicator_data(operator_idx, region, month):
    """生成指标数据"""
    scale = REGION_SCALE.get(region, 0.5)
    random.seed(operator_idx * 200 + hash(month) % 2000 + 1)

    def rate(base_min, base_max):
        return round(random.uniform(base_min, base_max), 2)

    def prb():
        return round(random.uniform(20, 70), 2)

    # LTE 频段速率指标 (Mbps)
    lte_700M_dl = rate(35, 55)
    lte_700M_ul = rate(6, 12)
    lte_800M_dl = rate(45, 70)
    lte_800M_ul = rate(10, 18)
    lte_900M_dl = rate(80, 150)
    lte_900M_ul = rate(15, 30)
    lte_1400M_dl = rate(70, 120)
    lte_1400M_ul = rate(14, 25)
    lte_1800M_dl = rate(120, 220)
    lte_1800M_ul = rate(25, 50)
    lte_2100M_dl = rate(100, 190)
    lte_2100M_ul = rate(20, 40)
    lte_2600M_dl = rate(180, 350)
    lte_2600M_ul = rate(35, 70)

    # NR 频段速率指标 (Mbps)
    nr_700M_dl = rate(60, 130)
    nr_700M_ul = rate(12, 30)
    nr_800M_dl = rate(80, 150)
    nr_800M_ul = rate(15, 35)
    nr_900M_dl = rate(120, 250)
    nr_900M_ul = rate(25, 55)
    nr_1400M_dl = rate(150, 280)
    nr_1400M_ul = rate(30, 60)
    nr_1800M_dl = rate(200, 400)
    nr_1800M_ul = rate(40, 80)
    nr_2100M_dl = rate(180, 350)
    nr_2100M_ul = rate(35, 70)
    nr_2600M_dl = rate(280, 500)
    nr_2600M_ul = rate(50, 95)
    nr_3500M_dl = rate(400, 750)
    nr_3500M_ul = rate(70, 130)
    nr_4900M_dl = rate(350, 600)
    nr_4900M_ul = rate(60, 110)
    nr_2300M_dl = rate(200, 450)
    nr_2300M_ul = rate(40, 85)

    # PRB利用率
    lte_700M_dl_prb = prb()
    lte_700M_ul_prb = prb()
    lte_800M_dl_prb = prb()
    lte_800M_ul_prb = prb()
    lte_900M_dl_prb = prb()
    lte_900M_ul_prb = prb()
    lte_1400M_dl_prb = prb()
    lte_1400M_ul_prb = prb()
    lte_1800M_dl_prb = prb()
    lte_1800M_ul_prb = prb()
    lte_2100M_dl_prb = prb()
    lte_2100M_ul_prb = prb()
    lte_2600M_dl_prb = prb()
    lte_2600M_ul_prb = prb()

    nr_700M_dl_prb = prb()
    nr_700M_ul_prb = prb()
    nr_800M_dl_prb = prb()
    nr_800M_ul_prb = prb()
    nr_900M_dl_prb = prb()
    nr_900M_ul_prb = prb()
    nr_1400M_dl_prb = prb()
    nr_1400M_ul_prb = prb()
    nr_1800M_dl_prb = prb()
    nr_1800M_ul_prb = prb()
    nr_2100M_dl_prb = prb()
    nr_2100M_ul_prb = prb()
    nr_2600M_dl_prb = prb()
    nr_2600M_ul_prb = prb()
    nr_3500M_dl_prb = prb()
    nr_3500M_ul_prb = prb()
    nr_4900M_dl_prb = prb()
    nr_4900M_ul_prb = prb()
    nr_2300M_dl_prb = prb()
    nr_2300M_ul_prb = prb()

    # 汇总指标
    lte_avg_dl = rate(100, 200)
    lte_avg_prb = prb()
    nr_avg_dl = rate(250, 500)
    nr_avg_prb = prb()

    # 其他KPI
    split_ratio = round(random.uniform(50, 80), 2)
    dwell_ratio = round(random.uniform(65, 85), 2)
    terminal_penetration = round(random.uniform(35, 60), 2)
    duration_dwell_ratio = round(random.uniform(70, 90), 2)
    fallback_ratio = round(random.uniform(8, 18), 2)

    return (
        lte_700M_dl, lte_700M_ul, lte_700M_dl_prb, lte_700M_ul_prb,
        lte_800M_dl, lte_800M_ul, lte_800M_dl_prb, lte_800M_ul_prb,
        lte_900M_dl, lte_900M_ul, lte_900M_dl_prb, lte_900M_ul_prb,
        lte_1400M_dl, lte_1400M_ul, lte_1400M_dl_prb, lte_1400M_ul_prb,
        lte_1800M_dl, lte_1800M_ul, lte_1800M_dl_prb, lte_1800M_ul_prb,
        lte_2100M_dl, lte_2100M_ul, lte_2100M_dl_prb, lte_2100M_ul_prb,
        lte_2600M_dl, lte_2600M_ul, lte_2600M_dl_prb, lte_2600M_ul_prb,
        nr_700M_dl, nr_700M_ul, nr_700M_dl_prb, nr_700M_ul_prb,
        nr_800M_dl, nr_800M_ul, nr_800M_dl_prb, nr_800M_ul_prb,
        nr_900M_dl, nr_900M_ul, nr_900M_dl_prb, nr_900M_ul_prb,
        nr_1400M_dl, nr_1400M_ul, nr_1400M_dl_prb, nr_1400M_ul_prb,
        nr_1800M_dl, nr_1800M_ul, nr_1800M_dl_prb, nr_1800M_ul_prb,
        nr_2100M_dl, nr_2100M_ul, nr_2100M_dl_prb, nr_2100M_ul_prb,
        nr_2600M_dl, nr_2600M_ul, nr_2600M_dl_prb, nr_2600M_ul_prb,
        nr_3500M_dl, nr_3500M_ul, nr_3500M_dl_prb, nr_3500M_ul_prb,
        nr_4900M_dl, nr_4900M_ul, nr_4900M_dl_prb, nr_4900M_ul_prb,
        nr_2300M_dl, nr_2300M_ul, nr_2300M_dl_prb, nr_2300M_ul_prb,
        lte_avg_dl, lte_avg_prb, nr_avg_dl, nr_avg_prb,
        split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio
    )

def generate_sql():
    """生成完整的SQL数据文件"""
    operator_idx = 1
    site_values = []
    indicator_values = []
    months = ['2026-02', '2026-03']

    for region, operators in OPERATORS.items():
        for op_name, country in operators:
            for month in months:
                # 生成站点数据
                site_data = generate_site_data(operator_idx, region, month)
                site_values.append(
                    f"({operator_idx}, '{month}', {', '.join(map(str, site_data))})"
                )

                # 生成指标数据
                indicator_data = generate_indicator_data(operator_idx, region, month)
                indicator_values.append(
                    f"({operator_idx}, '{month}', {', '.join(map(str, indicator_data))})"
                )

            operator_idx += 1

    # 生成SQL文件
    site_sql = """-- 站点数据 (基于全球%d个运营商)\nINSERT INTO site_info (operator_id, data_month,
    lte_700M_site, lte_700M_cell,
    lte_800M_site, lte_800M_cell,
    lte_900M_site, lte_900M_cell,
    lte_1400M_site, lte_1400M_cell,
    lte_1800M_site, lte_1800M_cell,
    lte_2100M_site, lte_2100M_cell,
    lte_2600M_site, lte_2600M_cell,
    nr_700M_site, nr_700M_cell,
    nr_800M_site, nr_800M_cell,
    nr_900M_site, nr_900M_cell,
    nr_1400M_site, nr_1400M_cell,
    nr_1800M_site, nr_1800M_cell,
    nr_2100M_site, nr_2100M_cell,
    nr_2600M_site, nr_2600M_cell,
    nr_3500M_site, nr_3500M_cell,
    nr_4900M_site, nr_4900M_cell,
    nr_2300M_site, nr_2300M_cell,
    lte_total_site, nr_total_site) VALUES\n%s;
""" % (operator_idx - 1, ',\n'.join(site_values))

    indicator_sql = f"""-- 指标数据 (基于全球{operator_idx-1}个运营商)
INSERT INTO indicator_info (operator_id, data_month,
    lte_700M_dl_rate, lte_700M_ul_rate, lte_700M_dl_prb, lte_700M_ul_prb,
    lte_800M_dl_rate, lte_800M_ul_rate, lte_800M_dl_prb, lte_800M_ul_prb,
    lte_900M_dl_rate, lte_900M_ul_rate, lte_900M_dl_prb, lte_900M_ul_prb,
    lte_1400M_dl_rate, lte_1400M_ul_rate, lte_1400M_dl_prb, lte_1400M_ul_prb,
    lte_1800M_dl_rate, lte_1800M_ul_rate, lte_1800M_dl_prb, lte_1800M_ul_prb,
    lte_2100M_dl_rate, lte_2100M_ul_rate, lte_2100M_dl_prb, lte_2100M_ul_prb,
    lte_2600M_dl_rate, lte_2600M_ul_rate, lte_2600M_dl_prb, lte_2600M_ul_prb,
    nr_700M_dl_rate, nr_700M_ul_rate, nr_700M_dl_prb, nr_700M_ul_prb,
    nr_800M_dl_rate, nr_800M_ul_rate, nr_800M_dl_prb, nr_800M_ul_prb,
    nr_900M_dl_rate, nr_900M_ul_rate, nr_900M_dl_prb, nr_900M_ul_prb,
    nr_1400M_dl_rate, nr_1400M_ul_rate, nr_1400M_dl_prb, nr_1400M_ul_prb,
    nr_1800M_dl_rate, nr_1800M_ul_rate, nr_1800M_dl_prb, nr_1800M_ul_prb,
    nr_2100M_dl_rate, nr_2100M_ul_rate, nr_2100M_dl_prb, nr_2100M_ul_prb,
    nr_2600M_dl_rate, nr_2600M_ul_rate, nr_2600M_dl_prb, nr_2600M_ul_prb,
    nr_3500M_dl_rate, nr_3500M_ul_rate, nr_3500M_dl_prb, nr_3500M_ul_prb,
    nr_4900M_dl_rate, nr_4900M_ul_rate, nr_4900M_dl_prb, nr_4900M_ul_prb,
    nr_2300M_dl_rate, nr_2300M_ul_rate, nr_2300M_dl_prb, nr_2300M_ul_prb,
    lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb,
    traffic_ratio, traffic_campratio, terminal_penetration, duration_campratio, fallback_ratio) VALUES
%s;
""" % ',\n'.join(indicator_values)

    return site_sql + "\n" + indicator_sql

if __name__ == '__main__':
    output_path = os.path.join(os.path.dirname(__file__), 'generated_test_data.sql')
    sql_content = generate_sql()
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- ============================================================================\n")
        f.write("-- 全球运营商测试数据 (自动生成)\n")
        f.write(f"-- 生成时间: 2026-04-11\n")
        f.write("-- ============================================================================\n\n")
        f.write(sql_content)
    print(f"Generated SQL data to: {output_path}")

    # 统计
    total = sum(len(ops) for ops in OPERATORS.values())
    print(f"\n统计:")
    for region, ops in OPERATORS.items():
        print(f"  {region}: {len(ops)} 个运营商")
    print(f"  总计: {total} 个运营商")
    print(f"  数据月份: 2026-02, 2026-03")
    print(f"  site_info 记录数: {total * 2}")
    print(f"  indicator_info 记录数: {total * 2}")
