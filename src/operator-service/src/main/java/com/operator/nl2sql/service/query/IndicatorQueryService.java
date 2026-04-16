package com.operator.nl2sql.service.query;

import com.operator.nl2sql.dto.BandIndicatorResponse;
import com.operator.nl2sql.dto.OperatorMetricsResponse;
import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.repository.IndicatorRepository;
import com.operator.nl2sql.service.builder.IndicatorSqlBuilder;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class IndicatorQueryService {

    private final IndicatorRepository indicatorRepository;
    private final IndicatorSqlBuilder indicatorSqlBuilder;

    public IndicatorQueryService(IndicatorRepository indicatorRepository, IndicatorSqlBuilder indicatorSqlBuilder) {
        this.indicatorRepository = indicatorRepository;
        this.indicatorSqlBuilder = indicatorSqlBuilder;
    }

    public List<IndicatorInfo> findAllIndicators() {
        return indicatorRepository.findAll();
    }

    public List<IndicatorInfo> findLatestIndicators(Long operatorId) {
        return indicatorRepository.findLatestIndicators(operatorId);
    }

    public List<IndicatorInfo> findIndicatorsByOperatorId(Long operatorId) {
        return indicatorRepository.findIndicatorsByOperatorId(operatorId);
    }

    public IndicatorInfo findIndicatorsByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return indicatorRepository.findIndicatorsByOperatorIdAndMonth(operatorId, dataMonth);
    }

    public List<IndicatorInfo> findTrendData(Long operatorId) {
        return indicatorRepository.findTrendData(operatorId);
    }

    // ==================== SQL构建器方法 ====================

    public String buildSelectSql() {
        return indicatorSqlBuilder.buildSelectSql();
    }

    public String buildSelectSql(String condition) {
        return indicatorSqlBuilder.buildSelectSql(condition);
    }

    public String buildByOperatorId(Long operatorId) {
        return indicatorSqlBuilder.buildByOperatorId(operatorId);
    }

    public String buildByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return indicatorSqlBuilder.buildByOperatorIdAndMonth(operatorId, dataMonth);
    }

    public String buildLatestForAllOperators() {
        return indicatorSqlBuilder.buildLatestForAllOperators();
    }

    public String buildLatestByOperatorId(Long operatorId) {
        return indicatorSqlBuilder.buildLatestByOperatorId(operatorId);
    }

    public String buildTrendByOperatorId(Long operatorId) {
        return indicatorSqlBuilder.buildTrendByOperatorId(operatorId);
    }

    public String buildSummaryByMonth(String dataMonth) {
        return indicatorSqlBuilder.buildSummaryByMonth(dataMonth);
    }

    public String buildBandIndicator(Long operatorId, String dataMonth, String networkType, String band) {
        return indicatorSqlBuilder.buildBandIndicator(operatorId, dataMonth, networkType, band);
    }

public String getTableName() {
        return indicatorSqlBuilder.getTableName();
    }

    // ==================== 频段指标查询方法 ====================

    /**
     * 获取指定运营商和频段的指标数据
     * @param operatorId 运营商ID
     * @param band 频段 (如 "700M", "3500M")
     * @param networkType 网络类型 (如 "LTE", "NR")，如果为null则返回LTE和NR两条记录
     * @return BandIndicatorResponse 或 BandIndicatorListResponse（当networkType为空时）
     */
    public Object getBandIndicator(Long operatorId, String band, String networkType) {
        List<IndicatorInfo> indicators = indicatorRepository.findLatestIndicators(operatorId);
        if (indicators == null || indicators.isEmpty()) {
            return null;
        }

        IndicatorInfo indicator = indicators.get(0);

        // 如果未指定networkType，尝试同时获取LTE和NR
        if (networkType == null || networkType.isBlank()) {
            List<BandIndicatorResponse> indicatorList = new ArrayList<>();

            // 尝试LTE
            BandIndicatorResponse lteResponse = tryGetBandIndicator(indicator, operatorId, band, "LTE");
            if (lteResponse != null) {
                indicatorList.add(lteResponse);
            }

            // 尝试NR
            BandIndicatorResponse nrResponse = tryGetBandIndicator(indicator, operatorId, band, "NR");
            if (nrResponse != null) {
                indicatorList.add(nrResponse);
            }

            if (indicatorList.isEmpty()) {
                return null;
            }

            BandIndicatorResponse.BandIndicatorListResponse listResponse = new BandIndicatorResponse.BandIndicatorListResponse();
            listResponse.setOperatorId(operatorId);
            listResponse.setBand(band);
            listResponse.setDataMonth(indicator.getDataMonth());
            listResponse.setIndicators(indicatorList);
            return listResponse;
        }

        // 指定了networkType
        return tryGetBandIndicator(indicator, operatorId, band, networkType);
    }

    /**
     * 尝试获取指定频段的指标数据
     */
    private BandIndicatorResponse tryGetBandIndicator(IndicatorInfo indicator, Long operatorId, String band, String networkType) {
        String prefix = networkType.toLowerCase(Locale.ROOT) + band.toLowerCase(Locale.ROOT).replace("m", "M");

        try {
            Field dlRateField = IndicatorInfo.class.getDeclaredField(prefix + "DlRate");
            Field ulRateField = IndicatorInfo.class.getDeclaredField(prefix + "UlRate");
            Field dlPrbField = IndicatorInfo.class.getDeclaredField(prefix + "DlPrb");
            Field ulPrbField = IndicatorInfo.class.getDeclaredField(prefix + "UlPrb");

            dlRateField.setAccessible(true);
            ulRateField.setAccessible(true);
            dlPrbField.setAccessible(true);
            ulPrbField.setAccessible(true);

            BigDecimal dlRate = (BigDecimal) dlRateField.get(indicator);
            BigDecimal ulRate = (BigDecimal) ulRateField.get(indicator);
            BigDecimal dlPrb = (BigDecimal) dlPrbField.get(indicator);
            BigDecimal ulPrb = (BigDecimal) ulPrbField.get(indicator);

            // 检查是否有有效数据
            if (dlRate == null && ulRate == null && dlPrb == null && ulPrb == null) {
                return null;
            }

            return BandIndicatorResponse.builder()
                    .operatorId(operatorId)
                    .band(band)
                    .networkType(networkType.toUpperCase(Locale.ROOT))
                    .dataMonth(indicator.getDataMonth())
                    .dlRate(dlRate)
                    .ulRate(ulRate)
                    .dlPrb(dlPrb)
                    .ulPrb(ulPrb)
                    .build();
        } catch (NoSuchFieldException | IllegalAccessException e) {
            return null;
        }
    }

    // ==================== 运营商汇总指标查询方法 ====================

    /**
     * 获取运营商级别汇总指标（分流比、驻留比、终端渗透率等）
     * @param operatorId 运营商ID，如果为null则返回所有运营商
     * @param dataMonth 数据月份，如果为null则返回最新月份
     * @return 运营商汇总指标列表
     */
    public List<OperatorMetricsResponse> getOperatorMetrics(Long operatorId, String dataMonth) {
        List<IndicatorInfo> indicators;
        if (dataMonth != null && !dataMonth.isBlank()) {
            indicators = indicatorRepository.findMetricsSummaryByMonth(operatorId, dataMonth);
        } else {
            indicators = indicatorRepository.findMetricsSummary(operatorId);
        }

        if (indicators == null || indicators.isEmpty()) {
            return List.of();
        }

        return indicators.stream()
                .map(this::convertToMetricsResponse)
                .toList();
    }

    private OperatorMetricsResponse convertToMetricsResponse(IndicatorInfo indicator) {
        return OperatorMetricsResponse.builder()
                .operatorId(indicator.getOperatorId())
                .dataMonth(indicator.getDataMonth())
                // 分流比
                .trafficRatio(indicator.getTrafficRatio())
                .trafficRatioDesc("NR流量占总流量的比例")
                // 时长驻留比
                .durationCampRatio(indicator.getDurationCampratio())
                .durationCampRatioDesc("用户在NR网络驻留时长占总时长的比例")
                // 终端渗透率
                .terminalPenetration(indicator.getTerminalPenetration())
                .terminalPenetrationDesc("支持NR的终端占比")
                // 回流比
                .fallbackRatio(indicator.getFallbackRatio())
                .fallbackRatioDesc("NR用户回落到LTE的比例")
                // LTE平均指标
                .lteAvgDlRate(indicator.getLteAvgDlRate())
                .lteAvgUlRate(indicator.getLteAvgUlRate())
                .lteAvgDlPrb(indicator.getLteAvgDlPrb())
                .lteAvgUlPrb(indicator.getLteAvgUlPrb())
                // NR平均指标
                .nrAvgDlRate(indicator.getNrAvgDlRate())
                .nrAvgUlRate(indicator.getNrAvgUlRate())
                .nrAvgDlPrb(indicator.getNrAvgDlPrb())
                .nrAvgUlPrb(indicator.getNrAvgUlPrb())
                .build();
    }
}