/** Display labels for the overview when no verified scientific services exist. */
export const ADVISOR_OVERVIEW = {
  region: "Haouz Plain",
  subregion: "Marrakech-Safi, Morocco",
  syntheticLabel: "Synthetic demonstration workspace",
  monitoringStatus: "No verified data feeds connected",
  scientificValidationStatus: "No scientifically validated observations available",
  historicalStatus: "No verified historical time series available",
  conditionSummaries: [
    {
      title: "Vegetation condition",
      status: "Not assessed",
      detail: "No verified vegetation observations are connected.",
    },
    {
      title: "Moisture context",
      status: "Not assessed",
      detail: "No verified moisture observations are connected.",
    },
    {
      title: "Climate context",
      status: "Unavailable",
      detail: "No verified climate time series are connected.",
    },
  ],
  potentialConcerns: [
    {
      title: "Vegetation change",
      status: "Assessment unavailable",
      detail: "There is not enough verified information to characterize a regional change.",
    },
    {
      title: "Low-moisture concern",
      status: "Assessment unavailable",
      detail: "This dashboard has no validated moisture assessment for the selected region.",
    },
  ],
} as const;
