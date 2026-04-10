-- 更新 indicator_info 表中 NR 2300M 指标数据
-- 基于各运营商和月份生成合理数据

-- 中国运营商 2026-03
UPDATE indicator_info SET
  nr_2300M_dl_rate = 285.60,
  nr_2300M_ul_rate = 52.40,
  nr_2300M_dl_prb = 55.80,
  nr_2300M_ul_prb = 62.30
WHERE operator_id = 1 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 245.80,
  nr_2300M_ul_rate = 45.60,
  nr_2300M_dl_prb = 48.20,
  nr_2300M_ul_prb = 55.80
WHERE operator_id = 2 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 268.50,
  nr_2300M_ul_rate = 50.20,
  nr_2300M_dl_prb = 52.80,
  nr_2300M_ul_prb = 58.60
WHERE operator_id = 3 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

-- 中国运营商 2026-02
UPDATE indicator_info SET
  nr_2300M_dl_rate = 275.50,
  nr_2300M_ul_rate = 50.80,
  nr_2300M_dl_prb = 54.20,
  nr_2300M_ul_prb = 60.80
WHERE operator_id = 1 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 235.50,
  nr_2300M_ul_rate = 44.20,
  nr_2300M_dl_prb = 46.50,
  nr_2300M_ul_prb = 53.80
WHERE operator_id = 2 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 258.80,
  nr_2300M_ul_rate = 48.60,
  nr_2300M_dl_prb = 50.50,
  nr_2300M_ul_prb = 56.80
WHERE operator_id = 3 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

-- 欧洲运营商 2026-03 (Deutsche Telekom, Vodafone, Orange, Telefonica, BT Group)
UPDATE indicator_info SET
  nr_2300M_dl_rate = 310.50,
  nr_2300M_ul_rate = 58.60,
  nr_2300M_dl_prb = 58.80,
  nr_2300M_ul_prb = 65.50
WHERE operator_id = 4 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 280.50,
  nr_2300M_ul_rate = 52.80,
  nr_2300M_dl_prb = 54.50,
  nr_2300M_ul_prb = 62.30
WHERE operator_id = 5 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 265.80,
  nr_2300M_ul_rate = 50.20,
  nr_2300M_dl_prb = 52.60,
  nr_2300M_ul_prb = 59.80
WHERE operator_id = 6 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 245.60,
  nr_2300M_ul_rate = 46.80,
  nr_2300M_dl_prb = 50.20,
  nr_2300M_ul_prb = 58.50
WHERE operator_id = 7 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 225.80,
  nr_2300M_ul_rate = 42.50,
  nr_2300M_dl_prb = 48.50,
  nr_2300M_ul_prb = 55.80
WHERE operator_id = 8 AND data_month = '2026-03' AND nr_2300M_dl_rate IS NULL;

-- 欧洲运营商 2026-02
UPDATE indicator_info SET
  nr_2300M_dl_rate = 295.50,
  nr_2300M_ul_rate = 56.20,
  nr_2300M_dl_prb = 56.50,
  nr_2300M_ul_prb = 63.20
WHERE operator_id = 4 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 268.50,
  nr_2300M_ul_rate = 50.50,
  nr_2300M_dl_prb = 52.30,
  nr_2300M_ul_prb = 60.20
WHERE operator_id = 5 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 255.50,
  nr_2300M_ul_rate = 48.20,
  nr_2300M_dl_prb = 50.80,
  nr_2300M_ul_prb = 58.20
WHERE operator_id = 6 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 235.50,
  nr_2300M_ul_rate = 44.50,
  nr_2300M_dl_prb = 48.50,
  nr_2300M_ul_prb = 56.20
WHERE operator_id = 7 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;

UPDATE indicator_info SET
  nr_2300M_dl_rate = 218.50,
  nr_2300M_ul_rate = 40.50,
  nr_2300M_dl_prb = 46.20,
  nr_2300M_ul_prb = 53.80
WHERE operator_id = 8 AND data_month = '2026-02' AND nr_2300M_dl_rate IS NULL;
