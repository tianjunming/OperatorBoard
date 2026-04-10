#!/usr/bin/env python3
"""更新运营商英文名称"""
import pymysql

# 中文到英文名称映射
NAME_MAPPING = {
    '中国移动': 'China Mobile',
    '中国电信': 'China Telecom',
    '中国联通': 'China Unicom',
    '中国铁塔': 'China Tower',
    'NTT DOCOMO': 'NTT DOCOMO',
    '软银': 'SoftBank',
    'KDDI': 'KDDI',
    'KT Corporation': 'KT Corporation',
    'SK电讯': 'SK Telecom',
    'LG Uplus': 'LG Uplus',
    'Singtel': 'Singtel',
    'StarHub': 'StarHub',
    'M1 Limited': 'M1',
    'AIS': 'AIS',
    'True Corporation': 'True Corporation',
    'DTAC': 'DTAC',
    'Globe Telecom': 'Globe Telecom',
    'Smart Communications': 'Smart Communications',
    'Celcom': 'Celcom',
    'Digi.com': 'Digi',
    'Telkom Indonesia': 'Telkom Indonesia',
    'Indosat Ooredoo Hutchison': 'Indosat Ooredoo Hutchison',
    'XL Axiata': 'XL Axiata',
    'Viettel Group': 'Viettel',
    'VNPT': 'VNPT',
    'Mobifone': 'Mobifone',
    'Bharti Airtel': 'Airtel',
    'BSNL': 'BSNL',
    'Reliance Jio': 'Reliance Jio',
    'Vodafone Idea': 'Vodafone Idea',
    'Telenor Pakistan': 'Telenor',
    'Jazz': 'Jazz',
    'Grameenphone': 'Grameenphone',
    'Robi Axiata': 'Robi',
    'Telstra': 'Telstra',
    'Optus': 'Optus',
    'TPG Telecom': 'TPG Telecom',
    'Spark New Zealand': 'Spark',
    'Vodafone New Zealand': 'Vodafone NZ',
    'Deutsche Telekom': 'Deutsche Telekom',
    'Vodafone Germany': 'Vodafone Germany',
    'O2 Germany': 'O2 Germany',
    'Telefonica': 'Telefonica',
    'Vodafone Spain': 'Vodafone Spain',
    'Orange Spain': 'Orange Spain',
    'Orange France': 'Orange France',
    'SFR': 'SFR',
    'Bouygues Telecom': 'Bouygues Telecom',
    'TIM': 'TIM',
    'Vodafone Italy': 'Vodafone Italy',
    'Wind Tre': 'Wind Tre',
    'BT Group': 'BT Group',
    'Vodafone UK': 'Vodafone UK',
    'O2 UK': 'O2 UK',
    'EE': 'EE',
    'Three UK': 'Three UK',
    'KPN': 'KPN',
    'Vodafone Netherlands': 'Vodafone Netherlands',
    'Proximus': 'Proximus',
    'Orange Belgium': 'Orange Belgium',
    'Swisscom': 'Swisscom',
    'Sunrise Communications': 'Sunrise',
    'A1 Telekom Austria': 'A1',
    'MTS': 'MTS',
    'Beeline': 'Beeline',
    'MegaFon': 'MegaFon',
    'Tele2 Russia': 'Tele2',
    'Play': 'Play',
    'Orange Polska': 'Orange Polska',
    'T-Mobile Polska': 'T-Mobile Poland',
    'O2 Czech Republic': 'O2 Czech',
    'T-Mobile Czech Republic': 'T-Mobile Czech',
    'Magyar Telekom': 'Magyar Telekom',
    'Orange Romania': 'Orange Romania',
    'Vodafone Romania': 'Vodafone Romania',
    'Turkcell': 'Turkcell',
    'Turk Telekom': 'Turk Telekom',
    'Vodafone Turkey': 'Vodafone Turkey',
    'Kyivstar': 'Kyivstar',
    'Vodafone Ukraine': 'Vodafone Ukraine',
    'AT&T': 'AT&T',
    'Verizon Communications': 'Verizon',
    'T-Mobile US': 'T-Mobile US',
    'Sprint': 'Sprint',
    'US Cellular': 'US Cellular',
    'Bell Canada': 'Bell Canada',
    'Rogers Communications': 'Rogers',
    'Telus': 'Telus',
    'Videotron': 'Videotron',
    'Telcel': 'Telcel',
    'AT&T Mexico': 'AT&T Mexico',
    'Movistar Mexico': 'Movistar Mexico',
    'Vivo': 'Vivo',
    'Claro Brazil': 'Claro Brazil',
    'TIM Brasil': 'TIM Brasil',
    'Oi': 'Oi',
    'Claro Argentina': 'Claro Argentina',
    'Movistar Argentina': 'Movistar Argentina',
    'Personal': 'Personal',
    'Entel Chile': 'Entel Chile',
    'Claro Chile': 'Claro Chile',
    'WOM Chile': 'WOM',
    'Claro Colombia': 'Claro Colombia',
    'Movistar Colombia': 'Movistar Colombia',
    'Tigo Colombia': 'Tigo Colombia',
    'Claro Peru': 'Claro Peru',
    'Entel Peru': 'Entel Peru',
    'Movistar Peru': 'Movistar Peru',
    'Claro Ecuador': 'Claro Ecuador',
    'Movilnet': 'Movilnet',
    'CNT': 'CNT',
    'Conecel': 'Conecel',
    'Bitel': 'Bitel',
    'Etisalat UAE': 'Etisalat UAE',
    'du': 'du',
    'STC': 'STC',
    'Mobily': 'Mobily',
    'Zain Saudi Arabia': 'Zain KSA',
    'Ooredoo Qatar': 'Ooredoo Qatar',
    'Vodafone Qatar': 'Vodafone Qatar',
    'Zain Kuwait': 'Zain Kuwait',
    'Ooredoo Kuwait': 'Ooredoo Kuwait',
    'Batelco': 'Batelco',
    'Omantel': 'Omantel',
    'Ooredoo Oman': 'Ooredoo Oman',
    'Cellcom Israel': 'Cellcom',
    'Partner Communications': 'Partner',
    'Pelephone': 'Pelephone',
    'MCI': 'MCI',
    'Irancell': 'Irancell',
    'Zain Iraq': 'Zain Iraq',
    'Asiacell': 'Asiacell',
    'Korek Telecom': 'Korek',
    'Zain Jordan': 'Zain Jordan',
    'Orange Jordan': 'Orange Jordan',
    'Alfa': 'Alfa',
    'Touch': 'Touch',
    'Orange Egypt': 'Orange Egypt',
    'Vodafone Egypt': 'Vodafone Egypt',
    'Etisalat Misr': 'Etisalat Misr',
    'WE': 'WE',
    'Maroc Telecom': 'Maroc Telecom',
    'Orange Morocco': 'Orange Morocco',
    'inwi': 'inwi',
    'Djezzy': 'Djezzy',
    'Ooredoo Algeria': 'Ooredoo Algeria',
    'Mobilis': 'Mobilis',
    'Orange Tunisia': 'Orange Tunisia',
    'Tunisiana': 'Tunisiana',
    'Libya Tel': 'Libya Tel',
    'MTN South Africa': 'MTN South Africa',
    'Vodacom': 'Vodacom',
    'Cell C': 'Cell C',
    'MTN Nigeria': 'MTN Nigeria',
    'Airtel Nigeria': 'Airtel Nigeria',
    'Globacom': 'Globacom',
    'Safaricom': 'Safaricom',
    'Airtel Kenya': 'Airtel Kenya',
    'Telekom Kenya': 'Telekom Kenya',
    'Ethio Telecom': 'Ethio Telecom',
    'Vodacom Tanzania': 'Vodacom Tanzania',
    'Airtel Tanzania': 'Airtel Tanzania',
    'Tigo Tanzania': 'Tigo Tanzania',
    'MTN Uganda': 'MTN Uganda',
    'Airtel Uganda': 'Airtel Uganda',
    'MTN Ghana': 'MTN Ghana',
    'Vodafone Ghana': 'Vodafone Ghana',
    'AirtelTigo': 'AirtelTigo',
    'MTN Ivory Coast': 'MTN Ivory Coast',
    'Orange Ivory Coast': 'Orange Ivory Coast',
    'Orange Senegal': 'Orange Senegal',
    'Tigo Senegal': 'Tigo Senegal',
    'MTN Cameroon': 'MTN Cameroon',
    'Orange Cameroon': 'Orange Cameroon',
    'Airtel DRC': 'Airtel DRC',
    'Vodacom DRC': 'Vodacom DRC',
}

conn = pymysql.connect(host='localhost', user='test', password='test', database='operator_db', charset='utf8mb4')
cursor = conn.cursor()

# 更新 operator_info 表
print("更新 operator_info 表...")
for cn_name, en_name in NAME_MAPPING.items():
    cursor.execute("UPDATE operator_info SET operator_name_en = %s WHERE operator_name = %s", (en_name, cn_name))

# 对于没有映射的，保持原值（如果已经是英文则不变）
cursor.execute("UPDATE operator_info SET operator_name_en = operator_name WHERE operator_name_en IS NULL")

conn.commit()
print(f"更新了 {cursor.rowcount} 条记录")

# 同步更新 site_info 表
print("同步更新 site_info 表...")
cursor.execute("""
    UPDATE site_info s
    JOIN operator_info o ON s.operator_id = o.id
    SET s.operator_name_cn = o.operator_name,
        s.operator_name_en = o.operator_name_en
""")
conn.commit()
print(f"更新了 {cursor.rowcount} 条 site_info 记录")

# 同步更新 indicator_info 表
print("同步更新 indicator_info 表...")
cursor.execute("""
    UPDATE indicator_info i
    JOIN operator_info o ON i.operator_id = o.id
    SET i.operator_name_cn = o.operator_name,
        i.operator_name_en = o.operator_name_en
""")
conn.commit()
print(f"更新了 {cursor.rowcount} 条 indicator_info 记录")

# 验证
cursor.execute("SELECT id, operator_name, operator_name_en, country FROM operator_info LIMIT 10")
print("\n=== operator_info 示例数据 ===")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} / {row[2]} ({row[3]})")

cursor.execute("SELECT operator_id, operator_name_cn, operator_name_en, data_month FROM site_info LIMIT 5")
print("\n=== site_info 示例数据 ===")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} / {row[2]} ({row[3]})")

cursor.close()
conn.close()
print("\n完成!")
