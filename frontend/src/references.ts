export type Reference = {
  id: string;
  shortCitation: string;
  doi: string;
  relevance: string;
};

export const REFERENCES: Reference[] = [
  { id: "N1", shortCitation: "Ouaadi et al. (2021), Earth System Science Data", doi: "https://doi.org/10.5194/essd-13-3707-2021", relevance: "Haouz field dataset combining Sentinel-1 with in-situ agricultural measurements; relevant to local monitoring and future validation." },
  { id: "N2", shortCitation: "Ouaadi et al. (2020), Remote Sensing of Environment", doi: "https://doi.org/10.1016/j.rse.2020.112050", relevance: "Sentinel-1 monitoring of wheat in semiarid environments, including Moroccan agricultural conditions." },
  { id: "N3", shortCitation: "Duchemin et al. (2006), Agricultural Water Management", doi: "https://doi.org/10.1016/j.agwat.2005.02.013", relevance: "NDVI, LAI, evapotranspiration and crop coefficients in irrigated Haouz wheat; contextual only, not transferable to citrus or olives." },
  { id: "N4", shortCitation: "Kharrou et al. (2021), Remote Sensing", doi: "https://doi.org/10.3390/rs13061133", relevance: "NDVI-derived vegetation with FAO-56 water balance and independent ET in Moroccan agriculture; future research pathway." },
  { id: "N5", shortCitation: "Ezzahar et al. (2020), Remote Sensing", doi: "https://doi.org/10.3390/rs12010072", relevance: "Sentinel-1 VV/VH with soil moisture and surface roughness over bare soil; site- and condition-dependent." },
  { id: "N6", shortCitation: "Ouaadi et al. (2021), Remote Sensing", doi: "https://doi.org/10.3390/rs13142667", relevance: "Soil-moisture assimilation for irrigation scheduling; demonstrates irrigation estimation needs more than backscatter." },
  { id: "N7", shortCitation: "Mengen et al. (2021), Remote Sensing", doi: "https://doi.org/10.3390/rs13040825", relevance: "Multi-frequency SAR illustrating complementary information from different radar frequencies." },
  { id: "N9", shortCitation: "Ceccato et al. (2001), Remote Sensing of Environment", doi: "https://doi.org/10.1016/S0034-4257(01)00191-2", relevance: "Physical relationship between optical reflectance and vegetation water content." },
  { id: "N10", shortCitation: "Gao (1996), Remote Sensing of Environment", doi: "https://doi.org/10.1016/S0034-4257(96)00067-3", relevance: "Original NDWI formulation; not confused with NDMI or surface-water NDWI." },
  { id: "N11", shortCitation: "Gruber et al. (2020), Remote Sensing of Environment", doi: "https://doi.org/10.1016/j.rse.2020.111806", relevance: "Satellite soil-moisture validation best practices, uncertainty, and spatial support." },
  { id: "N12", shortCitation: "Roberts et al. (2017), Ecography", doi: "https://doi.org/10.1111/ecog.02881", relevance: "Spatial and temporal dependence in predictive model evaluation." },
  { id: "N13", shortCitation: "Zekoll et al. (2021), Remote Sensing", doi: "https://doi.org/10.3390/rs13010137", relevance: "Differences between cloud-masking approaches and quality-mask limitations." },
  { id: "D1", shortCitation: "Ouassanouan et al. (2026), Scientific Data", doi: "https://doi.org/10.6084/m9.figshare.28486022.v2", relevance: "Historical Moroccan crop and irrigation parcel dataset; labels are not continuously updated observations. Bibliographic DOI must be verified against project documentation." },
  { id: "D2", shortCitation: "DataSuds dataset", doi: "https://doi.org/10.23708/8D6WQC", relevance: "Historical field measurements associated with N1; not contemporary ground truth for the 2026 campaign." },
];
