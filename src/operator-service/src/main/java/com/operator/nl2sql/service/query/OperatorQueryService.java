package com.operator.nl2sql.service.query;

import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.IndicatorInfo;
import com.operator.nl2sql.entity.SiteCellSummary;
import com.operator.nl2sql.entity.SiteSummary;
import com.operator.nl2sql.entity.IndicatorSummary;
import com.operator.nl2sql.entity.OperatorSummary;
import com.operator.nl2sql.repository.IndicatorRepository;
import com.operator.nl2sql.repository.OperatorRepository;
import com.operator.nl2sql.repository.OperatorSummaryMapper;
import com.operator.nl2sql.repository.SiteStatisticsMapper;
import com.operator.nl2sql.repository.SiteSummaryMapper;
import com.operator.nl2sql.repository.IndicatorSummaryMapper;
import com.operator.nl2sql.service.builder.OperatorSqlBuilder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OperatorQueryService {

    private final OperatorRepository operatorRepository;
    private final OperatorSqlBuilder operatorSqlBuilder;
    private final SiteStatisticsMapper siteStatisticsMapper;
    private final IndicatorRepository indicatorRepository;
    private final SiteSummaryMapper siteSummaryMapper;
    private final IndicatorSummaryMapper indicatorSummaryMapper;
    private final OperatorSummaryMapper operatorSummaryMapper;

    public OperatorQueryService(OperatorRepository operatorRepository,
                                  OperatorSqlBuilder operatorSqlBuilder,
                                  SiteStatisticsMapper siteStatisticsMapper,
                                  IndicatorRepository indicatorRepository,
                                  SiteSummaryMapper siteSummaryMapper,
                                  IndicatorSummaryMapper indicatorSummaryMapper,
                                  OperatorSummaryMapper operatorSummaryMapper) {
        this.operatorRepository = operatorRepository;
        this.operatorSqlBuilder = operatorSqlBuilder;
        this.siteStatisticsMapper = siteStatisticsMapper;
        this.indicatorRepository = indicatorRepository;
        this.siteSummaryMapper = siteSummaryMapper;
        this.indicatorSummaryMapper = indicatorSummaryMapper;
        this.operatorSummaryMapper = operatorSummaryMapper;
    }

    public List<OperatorInfo> findAllOperators() {
        return operatorRepository.findAll();
    }

    public List<OperatorInfo> findByCountry(String country) {
        return operatorRepository.findByCountry(country);
    }

    public List<OperatorInfo> findByOperatorName(String operatorName) {
        return operatorRepository.findByOperatorName(operatorName);
    }

    public OperatorInfo findOperatorById(Long id) {
        return operatorRepository.findById(id);
    }

    public List<SiteCellSummary> findAllSiteCellSummary() {
        return operatorRepository.findAllSiteCellSummary();
    }

    public List<SiteCellSummary> findSiteCellSummaryByOperatorId(Long operatorId) {
        return operatorRepository.findSiteCellSummaryByOperatorId(operatorId);
    }

    public SiteCellSummary findSiteCellSummaryByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return operatorRepository.findSiteCellSummaryByOperatorIdAndMonth(operatorId, dataMonth);
    }

    public List<String> findDistinctDataMonths() {
        return operatorRepository.findDistinctDataMonths();
    }

    // ==================== Site Statistics (using SiteStatisticsMapper) ====================

    public List<SiteCellSummary> getOperatorSitesLatest(Long operatorId) {
        SiteCellSummary result = siteStatisticsMapper.findSiteCellSummaryLatestByOperatorId(operatorId);
        return result != null ? List.of(result) : List.of();
    }

    public List<SiteCellSummary> getAllOperatorsSitesLatest() {
        return siteStatisticsMapper.findAllSiteCellSummaryLatest();
    }

    public List<SiteCellSummary> getOperatorSitesHistory(Long operatorId) {
        return siteStatisticsMapper.findSiteCellSummaryByOperatorId(operatorId);
    }

    // ==================== Indicator Queries (using IndicatorRepository) ====================

    public IndicatorInfo getOperatorIndicatorsLatest(Long operatorId) {
        List<IndicatorInfo> indicators = indicatorRepository.findLatestIndicators(operatorId);
        return indicators.isEmpty() ? null : indicators.get(0);
    }

    public List<IndicatorInfo> getAllOperatorsIndicatorsLatest() {
        return indicatorRepository.findLatestIndicators(null);
    }

    public List<IndicatorInfo> getOperatorIndicatorsTrend(Long operatorId) {
        return indicatorRepository.findTrendData(operatorId);
    }

    // ==================== V2 Summary Table Queries ====================

    public List<SiteSummary> getAllOperatorsSiteSummaryLatest() {
        return siteSummaryMapper.findAllLatest();
    }

    public SiteSummary getOperatorSiteSummaryLatest(Long operatorId) {
        return siteSummaryMapper.findLatestByOperatorId(operatorId);
    }

    public List<SiteSummary> getOperatorSiteSummaryHistory(Long operatorId) {
        return siteSummaryMapper.findHistoryByOperatorId(operatorId);
    }

    public List<IndicatorSummary> getAllOperatorsIndicatorSummaryLatest() {
        return indicatorSummaryMapper.findAllLatest();
    }

    public IndicatorSummary getOperatorIndicatorSummaryLatest(Long operatorId) {
        return indicatorSummaryMapper.findLatestByOperatorId(operatorId);
    }

    public List<IndicatorSummary> getOperatorIndicatorSummaryHistory(Long operatorId) {
        return indicatorSummaryMapper.findHistoryByOperatorId(operatorId);
    }

    public List<IndicatorSummary> getAllOperatorsIndicatorSummaryMetrics() {
        return indicatorSummaryMapper.findAllLatestMetrics();
    }

    // ==================== Operator Summary Queries (operator_summary table) ====================

    public List<OperatorSummary> getAllOperatorsSummaryLatest() {
        return operatorSummaryMapper.findAllLatest();
    }

    public List<OperatorSummary> getAllOperatorsSummaryLatestByTech() {
        return operatorSummaryMapper.findAllLatestByTech();
    }

    public OperatorSummary getOperatorSummaryLatest(Long operatorId) {
        return operatorSummaryMapper.findLatestByOperatorId(operatorId);
    }

    public List<OperatorSummary> getOperatorSummaryHistory(Long operatorId) {
        return operatorSummaryMapper.findHistoryByOperatorId(operatorId);
    }

    public List<OperatorSummary> getAllOperatorsSummaryByTechnology(String technology) {
        return operatorSummaryMapper.findAllLatestByTechnology(technology);
    }

    // ==================== Helper Methods ====================

    private OperatorInfo findOperatorByName(String operatorName) {
        List<OperatorInfo> operators = operatorRepository.findByOperatorName(operatorName);
        return operators.isEmpty() ? null : operators.get(0);
    }

    // ==================== SQL构建器方法 ====================

    public String buildAllOperators() {
        return operatorSqlBuilder.buildAllOperators();
    }

    public String buildOperatorById(Long operatorId) {
        return operatorSqlBuilder.buildOperatorById(operatorId);
    }

    public String buildOperatorByName(String operatorName) {
        return operatorSqlBuilder.buildOperatorByName(operatorName);
    }

    public String buildAllSiteSummary() {
        return operatorSqlBuilder.buildAllSiteSummary();
    }

    public String buildSiteSummaryByOperatorId(Long operatorId) {
        return operatorSqlBuilder.buildSiteSummaryByOperatorId(operatorId);
    }

    public String buildSiteSummaryByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return operatorSqlBuilder.buildSiteSummaryByOperatorIdAndMonth(operatorId, dataMonth);
    }

    public String buildSiteSummaryByMonth(String dataMonth) {
        return operatorSqlBuilder.buildSiteSummaryByMonth(dataMonth);
    }

    public String buildSiteSummaryByBand(String dataMonth, String networkType, String band) {
        return operatorSqlBuilder.buildSiteSummaryByBand(dataMonth, networkType, band);
    }

    public String buildSelectSql() {
        return operatorSqlBuilder.buildSelectSql();
    }

    public String buildSelectSql(String condition) {
        return operatorSqlBuilder.buildSelectSql(condition);
    }

    public String getTableName() {
        return operatorSqlBuilder.getTableName();
    }
}