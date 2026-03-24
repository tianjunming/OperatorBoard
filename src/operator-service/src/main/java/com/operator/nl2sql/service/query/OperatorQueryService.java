package com.operator.nl2sql.service.query;

import com.operator.nl2sql.entity.OperatorInfo;
import com.operator.nl2sql.entity.SiteCellSummary;
import com.operator.nl2sql.repository.OperatorRepository;
import com.operator.nl2sql.service.builder.OperatorSqlBuilder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OperatorQueryService {

    private final OperatorRepository operatorRepository;
    private final OperatorSqlBuilder operatorSqlBuilder;

    public OperatorQueryService(OperatorRepository operatorRepository, OperatorSqlBuilder operatorSqlBuilder) {
        this.operatorRepository = operatorRepository;
        this.operatorSqlBuilder = operatorSqlBuilder;
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