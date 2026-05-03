import React, { useState } from 'react';
import { ChevronRight, Globe, MapPin, Building2 } from 'lucide-react';
import '../styles/OperatorTree.css';

/**
 * OperatorTree - Left panel tree navigation for operators
 * Structure: Region → Country → Operators
 * Data format from backend:
 * [{ name: "Asia-Pacific", type: "region", children: [{ name: "China", type: "country", children: [...] }] }]
 */
export default function OperatorTree({ data = [], selectedOperatorId, onSelect }) {
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedCountries, setExpandedCountries] = useState({});

  const toggleRegion = (region) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  const toggleCountry = (countryKey) => {
    setExpandedCountries(prev => ({ ...prev, [countryKey]: !prev[countryKey] }));
  };

  const handleOperatorClick = (operator) => {
    if (onSelect) {
      onSelect(operator);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="operator-tree-empty">
        <Globe size={32} />
        <p>暂无运营商数据</p>
      </div>
    );
  }

  // Count total operators in a region
  const countRegionOperators = (regionNode) => {
    let count = 0;
    if (regionNode.children) {
      for (const countryNode of regionNode.children) {
        if (countryNode.children) {
          count += countryNode.children.length;
        }
      }
    }
    return count;
  };

  // Count operators in a country
  const countCountryOperators = (countryNode) => {
    return countryNode.children ? countryNode.children.length : 0;
  };

  return (
    <div className="operator-tree">
      <div className="operator-tree-header">
        <Globe size={18} />
        <span>运营商列表</span>
      </div>
      <div className="operator-tree-content">
        {data.map((regionNode) => {
          const regionName = regionNode.name || regionNode.region || 'Unknown';
          const regionKey = regionName;
          const isRegionExpanded = expandedRegions[regionKey];

          return (
            <div key={regionKey} className="tree-region">
              <div
                className="tree-node tree-region-node"
                onClick={() => toggleRegion(regionKey)}
              >
                <ChevronRight
                  size={16}
                  className={`tree-chevron ${isRegionExpanded ? 'expanded' : ''}`}
                />
                <span className="tree-icon"><MapPin size={14} /></span>
                <span className="tree-label">{regionName}</span>
                <span className="tree-count">{countRegionOperators(regionNode)}</span>
              </div>

              {isRegionExpanded && regionNode.children && (
                <div className="tree-children">
                  {regionNode.children.map((countryNode) => {
                    const countryName = countryNode.name || countryNode.country || 'Unknown';
                    const countryKey = `${regionKey}|${countryName}`;
                    const isCountryExpanded = expandedCountries[countryKey];

                    return (
                      <div key={countryKey} className="tree-country">
                        <div
                          className="tree-node tree-country-node"
                          onClick={() => toggleCountry(countryKey)}
                        >
                          <ChevronRight
                            size={14}
                            className={`tree-chevron ${isCountryExpanded ? 'expanded' : ''}`}
                          />
                          <span className="tree-icon"><Building2 size={12} /></span>
                          <span className="tree-label">{countryName}</span>
                          <span className="tree-count">{countCountryOperators(countryNode)}</span>
                        </div>

                        {isCountryExpanded && countryNode.children && countryNode.children.length > 0 && (
                          <div className="tree-children">
                            {countryNode.children.map((child) => {
                              // Handle province level for China (intermediate node)
                              const isProvince = child.type === 'province';
                              const provinceKey = `${countryKey}|${child.name}`;
                              const isProvinceExpanded = expandedCountries[provinceKey];

                              if (isProvince) {
                                return (
                                  <div key={provinceKey} className="tree-province">
                                    <div
                                      className="tree-node tree-province-node"
                                      onClick={() => toggleCountry(provinceKey)}
                                    >
                                      <ChevronRight
                                        size={12}
                                        className={`tree-chevron ${isProvinceExpanded ? 'expanded' : ''}`}
                                      />
                                      <span className="tree-label">{child.name}</span>
                                      <span className="tree-count">{child.children ? child.children.length : 0}</span>
                                    </div>

                                    {isProvinceExpanded && child.children && child.children.length > 0 && (
                                      <div className="tree-children">
                                        {child.children.map((operator) => (
                                          <div
                                            key={operator.id || operator.operatorId || operator.name}
                                            className={`tree-node tree-operator-node ${
                                              selectedOperatorId === (operator.id || operator.operatorId) ? 'selected' : ''
                                            }`}
                                            onClick={() => handleOperatorClick(operator)}
                                          >
                                            <span className="tree-label">{operator.name || operator.operatorName}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Regular operator node (non-China countries)
                              return (
                                <div
                                  key={child.id || child.operatorId || child.name}
                                  className={`tree-node tree-operator-node ${
                                    selectedOperatorId === (child.id || child.operatorId) ? 'selected' : ''
                                  }`}
                                  onClick={() => handleOperatorClick(child)}
                                >
                                  <span className="tree-label">{child.name || child.operatorName}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
