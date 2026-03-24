package com.operator.nl2sql.service.query;

import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.repository.IndicatorRepository;
import com.operator.nl2sql.service.builder.IndicatorSqlBuilder;
import org.springframework.stereotype.Service;

import java.util.List;

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
}