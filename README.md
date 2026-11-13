# CodePulse

### Repository Health Monitoring and Explainable Anomaly Detection

CodePulse is a web-based repository analysis platform designed to help developers understand the health, maintainability, and potential risks of their software projects.

It transforms repository information into understandable insights through structured analysis, transparent health indicators, explainable anomaly detection, repository activity analysis, and visual codebase analytics.

**Development Status:** Active Development

---

## 1. Problem Statement

As software projects grow, maintaining code quality, tracking repository health, identifying unusual development patterns, and managing technical risks become increasingly difficult.

Existing development platforms provide useful tools, but developers may need to combine information from multiple sources to understand the overall condition of a repository.

CodePulse aims to bring relevant repository health indicators together and present them through a centralized, understandable dashboard.

## 2. Objectives

- Analyze repository-level health indicators.
- Identify potential anomalies and unusual patterns.
- Provide understandable explanations for detected issues.
- Highlight maintainability concerns and potential risks.
- Analyze recent repository commit activity and contributor participation.
- Present repository insights through a visual dashboard.
- Visualize programming-language distribution and codebase composition.
- Help developers make informed maintenance decisions.

## 3. Target Users

- Individual developers
- Students and academic project teams
- Software development teams
- Repository maintainers
- Developers interested in software quality and maintenance

## 4. Core Features and Development Status

### Implemented Features

**1. Frontend Foundation**

- React.js application using Vite.
- Dashboard interface with a light visual theme.
- Reusable Header and Sidebar components.
- Responsive dashboard layout and styling.

**2. Backend Foundation**

- Node.js and Express.js server.
- REST API configuration.
- CORS and environment configuration.
- Health-check endpoint.

**3. GitHub Repository Integration**

- GitHub repository URL validation.
- Public repository metadata retrieval through the GitHub REST API.
- Repository information including name, owner, description, stars, forks, default branch, primary language, last push date, archived status, disabled status, and issue-tracking availability.
- Error handling for invalid URLs, unavailable repositories, and API rate limits.

**4. Repository File-Tree Analysis**

- Recursive GitHub repository file-tree retrieval.
- Total file and directory counting.
- File-extension distribution.
- Source-code and supporting-file classification.
- Programming-language distribution based on file extensions.
- Exclusion of selected generated and dependency directories.
- README file detection.
- Detection of incomplete GitHub file-tree responses.
- Collection of source-file sizes for statistical analysis.

**5. Repository Health Indicators**

- Maintenance activity assessment based on the last repository push date.
- Repository status detection (active, archived, or disabled).
- GitHub issue-tracking status.
- Informational count of open issues and pull requests.
- README documentation detection.
- Codebase composition summary.
- Analysis completeness assessment.
- Overall health status based on transparent indicator rules.
- Individual explanations for each health indicator.
- No arbitrary numerical health score.

**6. File-Size Anomaly Detection**

- Identification of unusually large source files.
- File-size analysis using the Interquartile Range (IQR) statistical method.
- Logarithmic transformation of file sizes to reduce the influence of highly skewed size distributions.
- Independent analysis for each programming-language group.
- Minimum sample requirement of eight source files per language group.
- Language-specific anomaly thresholds.
- Detection of files exceeding their language-specific upper statistical threshold.
- Explanations containing the detected file size and threshold.
- Handling of insufficient data when no language group has enough files.
- Detection results include sample size, analyzed groups, skipped groups, thresholds, and anomaly counts.

**7. Live Repository Analysis Dashboard**

- Integration of the React frontend with the repository analysis API.
- Repository URL input and analysis action.
- Live repository metadata display.
- Repository overview metrics including stars, forks, open issues, and primary language.
- Codebase summary displaying total files, directories, source files, and supporting files.
- Overall repository health status.
- Seven individual health indicator cards with values, statuses, and explanations.
- File-size anomaly detection summary.
- Display of the statistical detection method and number of analyzed files.
- Language-specific detection threshold cards.
- Detected-file list showing file paths, programming languages, file sizes, thresholds, and explanations.
- Dynamic rendering of analysis results returned by the backend instead of hardcoded demonstration data.

**8. Language Distribution and Codebase Visualization**

- Visual representation of programming-language distribution.
- Proportional horizontal distribution bar showing the relative contribution of each detected language.
- Individual language breakdown with file counts and percentages.
- Languages automatically sorted in descending order by file count.
- Dynamic percentage calculation using the total number of language-classified files.
- Consistent color coding between the distribution bar and individual language entries.
- Data obtained directly from the repository analysis API.
- Empty-state handling when language distribution data is unavailable.
- Implemented using React and Tailwind CSS without an additional chart-library dependency.

**9. Repository Activity Analysis**

- Retrieval of recent repository commits through the GitHub REST API.
- Analysis of commit activity over a rolling 90-day period.
- Commit count and average commits per day and per week.
- Unique contributor count based on available GitHub author accounts.
- Latest commit information, including author, date, and commit link.
- Calculation of days since the latest commit.
- Activity classification into active, moderate, low, and inactive categories.
- Human-readable explanations of the activity classification.
- Paginated commit retrieval with a maximum of five pages and 100 commits per page.
- Pagination metadata showing retrieval completeness, pages fetched, and truncation status.
- Partial-result handling when later pagination requests fail.
- Graceful handling of unavailable activity data without stopping the main repository analysis.
- Dashboard cards displaying activity metrics, activity status, latest commit, and data completeness.

### Planned Features

The following features are part of the intended product scope and are not yet fully implemented:

- **Explainable Insights:** Extend explanations and provide more context about detected repository concerns.
- **Advanced Recommendations:** Provide actionable suggestions based on analysis results.
- **Historical Monitoring:** Track changes in repository health and activity over time.
- **Advanced Analysis:** Extend repository analysis with additional maintainability and code-quality metrics.
- **Database Integration:** Store repository analysis results and historical data.
- **AI/ML Exploration:** Evaluate whether machine-learning techniques can improve future repository analysis and recommendations.
- **Deployment:** Deploy the frontend and backend for public access.

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | User interface |
| Build Tool | Vite | Frontend development and build |
| Styling | Tailwind CSS | Dashboard styling and visualization |
| Backend | Node.js | Server-side execution |
| API Framework | Express.js | REST API development |
| Repository Integration | GitHub REST API | Repository data retrieval |
| Version Control | Git and GitHub | Source-code management |
| Analysis Engine | JavaScript | Repository file, health, activity, and anomaly analysis |
| Statistical Method | Log-transformed IQR | File-size outlier detection |
| Activity Analysis | JavaScript | Commit activity and contributor analysis |
| Visualization | React and Tailwind CSS | Repository metrics and language distribution |
| Database | MongoDB | Planned data persistence |
| AI/ML | To be evaluated | Future anomaly detection and recommendations |

Technology selections may evolve as development progresses.

---

## 6. Repository Analysis and Methodology

CodePulse currently supports analysis of publicly accessible GitHub repositories.

The analysis process retrieves repository metadata and its file tree, calculates repository metrics, evaluates health indicators, detects unusually large source files, and analyzes recent commit activity.

### Repository File-Tree Analysis

| Metric | Description |
|---|---|
| Repository Metadata | Basic repository information |
| Total Files | Number of files in the retrieved repository tree |
| Total Directories | Number of directory entries |
| Source Files | Files with recognized source-code extensions |
| Supporting Files | Documentation, configuration, assets, and other files |
| Excluded Files | Files inside selected excluded directories |
| Languages | Extension-based programming-language distribution |
| Extensions | Distribution of file extensions |
| README Detection | Whether a README file exists in the analyzed file tree |
| Completeness | Whether GitHub returned a complete file tree |

### Repository Health Indicators

CodePulse evaluates repository health using seven transparent indicators:

| Indicator | What It Evaluates |
|---|---|
| Maintenance Activity | Days since the last repository push |
| Repository Status | Whether the repository is active, archived, or disabled |
| Issue Tracking | Whether GitHub issue tracking is enabled |
| Open Work Items | Number of open issues and pull requests |
| Documentation | Whether a README file exists |
| Codebase Composition | File counts and programming-language distribution |
| Analysis Completeness | Whether GitHub returned the complete file tree |

#### Health Status Categories

| Status | Meaning |
|---|---|
| Good | No identified concern in the indicator |
| Moderate | A condition that may require monitoring |
| Needs Attention | A condition that may require developer attention |
| Unknown | Required information is unavailable |
| Info | Informational data that is not treated as a quality concern |

#### Maintenance Activity Thresholds

| Days Since Last Push | Status |
|---|---|
| 0–30 days | Good |
| 31–90 days | Moderate |
| More than 90 days | Needs Attention |

These thresholds are CodePulse heuristics and are not universal software-quality standards.

#### Overall Health Status

The overall status is determined by the individual indicator statuses:

1. **Needs Attention:** At least one indicator requires attention.
2. **Incomplete:** No indicator requires attention, but at least one is unknown.
3. **Moderate:** No indicator requires attention or is unknown, but at least one is moderate.
4. **Good:** None of the above conditions apply.

Informational indicators do not negatively affect the overall status.

**Important design decision:** CodePulse does not currently calculate an arbitrary percentage-based health score. Individual indicators and their explanations are presented to keep the assessment transparent.

### File-Size Anomaly Detection

CodePulse analyzes the sizes of recognized source files to identify files that are unusually large compared with other files written in the same programming language.

#### Detection Method

The current implementation uses a language-specific, log-transformed Interquartile Range (IQR) method.

1. Collect valid source-file sizes in bytes.
2. Group files by their detected programming language.
3. Skip language groups containing fewer than eight valid source files.
4. Apply the natural logarithmic transformation `ln(1 + file size)`.
5. Calculate the first quartile (Q1), third quartile (Q3), and interquartile range (IQR).
6. Calculate the upper outlier threshold:

   `Upper Fence = Q3 + (1.5 × IQR)`

7. Convert the threshold back to bytes using the inverse logarithmic transformation.
8. Flag files whose transformed sizes exceed the upper fence.

Each detected anomaly includes:

- File path
- Original file size in bytes
- Human-readable file size
- Programming language
- Language-specific threshold
- Human-readable threshold
- Explanation of why the file was flagged

#### Example

A JavaScript file measuring 120 KB may be flagged if its language-specific threshold is 79.01 KB.

This means the file is statistically larger than the upper threshold calculated for the analyzed JavaScript files. It does not automatically mean the file contains poor-quality code.

#### Detection Status

| Status | Meaning |
|---|---|
| Completed | At least one language group had enough files for analysis |
| Insufficient Data | No language group contained the minimum required number of files |

The anomaly response also reports:

- Total valid source files considered.
- Minimum group size.
- Number of analyzed language groups.
- Number of skipped language groups.
- Threshold and anomaly count for each analyzed language.
- Whether the source repository tree was truncated.

These values make the detection process more transparent and interpretable.

#### Current Limitations

- File size is a structural indicator, not a direct measurement of code quality.
- Large files may be legitimate, especially test files, generated source files, or complex modules.
- The detector identifies statistical outliers and does not determine whether a file is actually defective.
- Only source files recognized by the current extension-based language mapping are considered.
- Language groups with fewer than eight valid source files are skipped.
- Thresholds are statistical heuristics and may vary across repositories and programming languages.
- Log transformation reduces skew but does not eliminate every statistical limitation.
- A truncated GitHub file tree can affect the completeness of anomaly detection.
- The current implementation does not use a trained machine-learning model.

### Language Distribution Analysis

CodePulse uses the programming-language counts produced by repository file-tree analysis to visualize codebase composition.

The frontend receives the language distribution from the analysis response and dynamically generates the visualization.

#### Visualization Method

1. Retrieve the language-count object from the repository analysis response.
2. Convert the language entries into a list of language names and file counts.
3. Sort the languages in descending order by file count.
4. Calculate the total number of language-classified files.
5. Calculate each language's percentage:

   `Language Percentage = (Language File Count / Total Language Files) × 100`

6. Display a proportional distribution bar and individual language breakdowns.

#### Visualization Components

- **Proportional Distribution Bar:** Shows the relative contribution of each detected language.
- **Language Breakdown:** Displays each language's name, file count, and percentage.
- **Color Coding:** Uses consistent colors to distinguish languages across the chart and breakdown.
- **Dynamic Sorting:** Automatically places languages with more files before those with fewer files.
- **Empty State:** Displays an explanatory message when language data is unavailable.

The visualization uses React and Tailwind CSS and does not require an additional charting library.

**Important:** Language percentages are calculated from the files classified into programming-language groups. They do not necessarily represent the percentage of every file in the repository.

### Repository Activity Analysis

CodePulse analyzes recent commit activity to provide an overview of repository development activity and contributor participation.

The analysis uses commit information retrieved through the GitHub REST API.

#### Analysis Period

- The activity analysis uses a rolling 90-day period.
- Commits outside the analysis period are excluded.
- Invalid commit dates and future-dated commits are excluded from the activity calculations.
- Commit retrieval is paginated, with a maximum of five pages and 100 commits per page (up to 500 retrieved commits).

#### Activity Metrics

| Metric | Description |
|---|---|
| Total Commits | Number of valid commits included in the analysis period |
| Contributors | Number of unique available GitHub contributor accounts |
| Commits Per Day | Average commits per day across the analysis period |
| Commits Per Week | Average commits per week across the analysis period |
| Latest Commit | Most recent valid commit in the analysis period |
| Days Since Last Commit | Number of days since the latest commit |

Contributor counts are based on available GitHub author account information. Commits without an associated GitHub login are not counted as unique contributors.

#### Activity Classification

CodePulse classifies repository activity using the time elapsed since the latest commit:

| Activity Status | Condition | Meaning |
|---|---|---|
| Active | Latest commit within 7 days | Recent commit activity detected |
| Moderate | Latest commit within 8–30 days | Some recent activity, but at a lower frequency |
| Low | Latest commit more than 30 days ago | Limited recent activity |
| Inactive | No valid commits in the analysis period | No qualifying recent commit activity detected |

These categories are heuristic indicators. They do not independently measure development quality, project health, or the importance of individual commits.

#### Pagination and Data Completeness

GitHub commit retrieval uses pagination to collect commit records.

| Property | Description |
|---|---|
| Commits Per Page | Maximum of 100 |
| Maximum Pages | 5 |
| Maximum Retrieved Commits | 500 |
| Complete | All required commit pages were retrieved |
| Limit Reached | The configured retrieval limit was reached |
| Partial | Some pages were retrieved, but a later request failed |

The activity response includes pagination information such as pages retrieved, maximum pages, maximum commits, truncation status, and any retrieval warning.

When a later page request fails, previously retrieved commits can still be analyzed and returned with partial-data information.

If commit retrieval is unavailable, the main repository analysis can still succeed. The activity section reports that activity data is unavailable instead of preventing the rest of the dashboard from displaying.

#### Current Limitations

- The analysis covers a rolling 90-day period, not the complete repository history.
- Commit retrieval is limited to a maximum of 500 commits per analysis request.
- A repository with more qualifying commits than the retrieval limit may have incomplete activity metrics.
- Contributor counts depend on GitHub author account information being available.
- Commit frequency is a descriptive average, not a measure of code quality or productivity.
- Activity classifications are heuristic thresholds, not universal standards.
- The current implementation does not persist historical activity snapshots.
- The analysis does not evaluate commit-message quality, code changes, or the complexity of individual contributions.

### General Analysis Limitations

- Maintenance activity uses the last push date and does not independently measure development quality.
- Open work-item counts include issues and pull requests and are informational only.
- README detection checks filenames in the analyzed file tree; it does not evaluate documentation quality.
- Language classification is based on file extensions. It does not inspect source-code contents or reproduce GitHub Linguist's language-detection algorithm.
- A truncated GitHub file tree can affect the completeness of analysis.
- Health indicators are heuristic assessments, not definitive measurements of software quality.
- File-size anomalies do not automatically indicate defective code.
- Repository activity metrics describe recent commit history and do not measure developer productivity.
- Advanced recommendations, historical monitoring, database persistence, and AI/ML-based recommendations are not yet implemented.

---

## 7. Live Dashboard

The CodePulse frontend presents the analysis results returned by the backend through a single dashboard.

### Repository Input

Users can enter a public GitHub repository URL and start an analysis.

The dashboard displays loading feedback while the request is being processed and provides error messages when the analysis request fails.

### Repository Overview

The dashboard displays:

- Repository name and description.
- Repository visibility.
- Default branch.
- GitHub repository link.
- Stars, forks, and open issues.
- Primary programming language.
- Total files and directories.
- Source files and supporting files.

### Repository Activity

The dashboard includes a dedicated Repository Activity section displaying:

- Total commits during the 90-day analysis period.
- Number of unique available contributors.
- Average commits per day.
- Average commits per week.
- Activity status with an explanation.
- Days since the latest commit.
- Latest commit author and date.
- Link to view the latest commit on GitHub.
- Commit retrieval completeness information.
- Pages retrieved, maximum commit limit, and truncation status.
- Warnings when commit retrieval is incomplete.
- A fallback message when activity data is unavailable.

### Repository Health

The dashboard displays the overall health status and seven individual indicators.

Each indicator includes its status, corresponding value, and explanation. Informational indicators are visually distinguished from indicators requiring attention.

### Anomaly Dashboard

The anomaly dashboard presents:

- Detection status and total anomaly count.
- Number of source files analyzed.
- Statistical detection method.
- Language-specific upper thresholds.
- Sample size and anomaly count for each language.
- Individual detected-file entries.
- File path, language, file size, detection threshold, and explanation for each detected anomaly.

### Language Distribution Visualization

The dashboard includes a dedicated Language Distribution section below the Codebase Summary.

It presents:

- A proportional horizontal bar showing the distribution of detected programming languages.
- Individual language entries with file counts.
- Percentage contribution of each language.
- Consistent colors for each language.
- Languages sorted by file count in descending order.
- A total count of language-classified files.

The visualization is generated dynamically from the backend analysis response. It does not use hardcoded language counts or demonstration data.

---

## 8. Backend API

The current backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend welcome route |
| GET | `/api/health` | API health check |
| POST | `/api/repositories/validate` | Validate a GitHub repository URL |
| POST | `/api/repositories/analyze` | Retrieve repository metadata and analyze its file tree, health indicators, file-size anomalies, and recent activity |

### Repository Analysis Request

**Endpoint:**

`POST /api/repositories/analyze`

**Request body:**

```json
{
  "repositoryUrl": "https://github.com/facebook/react"
}
```

The successful response contains five main data sections:

- **metadata:** Repository details retrieved from GitHub.
- **tree:** File counts, language distribution, README detection, and file-tree completeness.
- **health:** Overall health status and seven individual health indicators with values, statuses, and explanations.
- **activity:** Recent commit activity, contributor metrics, activity classification, latest commit, and pagination completeness information.
- **anomalies:** File-size anomaly detection status, statistical method, language-specific thresholds, detected files, and explanations.

The frontend uses the `tree.languages` data from the analysis response to generate the Language Distribution visualization.

Activity retrieval is handled separately from the main repository metadata and file-tree analysis. If activity retrieval fails, the activity section reports an unavailable status while the other analysis results can still be returned.

### Activity Response Structure

The following is an illustrative structure. Actual values depend on the repository being analyzed.

```json
{
  "status": "completed",
  "analysisPeriodDays": 90,
  "commitCount": 152,
  "commitsPerDay": 1.69,
  "commitsPerWeek": 11.82,
  "contributorCount": 46,
  "activityStatus": "active",
  "daysSinceLastCommit": 1,
  "latestCommit": {
    "sha": "example-commit-sha",
    "url": "https://github.com/facebook/react/commit/example-commit-sha",
    "author": "example-user",
    "authorName": "Example Contributor",
    "date": "2026-11-12T15:46:50Z"
  },
  "pagination": {
    "status": "complete",
    "pagesFetched": 2,
    "maxPages": 5,
    "maxCommits": 500,
    "isComplete": true,
    "truncated": false,
    "warning": null
  },
  "dataCompleteness": "complete",
  "explanation": "Recent commit activity was detected within the last 7 days."
}
```

The values above are illustrative, not fixed API output.

Possible activity retrieval completeness statuses include:

- `complete`
- `limit_reached`
- `partial`
- `unavailable` for an activity retrieval failure

When activity retrieval is unavailable, the response contains an unavailable status and an explanation instead of the completed activity metrics.

### Anomaly Response Structure

The following is an illustrative structure. Actual values depend on the repository being analyzed.

```json
{
  "status": "completed",
  "method": "Language-specific Log-transformed IQR",
  "sampleSize": 4791,
  "minimumGroupSize": 8,
  "analyzedGroups": 6,
  "skippedGroups": 0,
  "anomalyCount": 48,
  "sourceTreeTruncated": false,
  "thresholdsByLanguage": {
    "JavaScript": {
      "sampleSize": 3911,
      "threshold": 80902.38,
      "formattedThreshold": "79.01 KB",
      "anomalyCount": 43
    }
  },
  "anomalies": [
    {
      "path": "src/example.js",
      "size": 120000,
      "formattedSize": "117.19 KB",
      "language": "JavaScript",
      "threshold": 80902.38,
      "formattedThreshold": "79.01 KB",
      "explanation": "This JavaScript file is larger than the language-specific upper IQR threshold of 79.01 KB."
    }
  ],
  "explanation": "48 unusually large source file(s) detected across 6 language group(s)."
}
```

### Health Response Structure

The health section follows this general structure:

```json
{
  "overallStatus": "good",
  "indicators": {
    "maintenance": {
      "value": 0,
      "status": "good",
      "explanation": "The repository has received a recent code push."
    },
    "repositoryStatus": {
      "value": "active",
      "status": "good",
      "explanation": "The repository is not archived or disabled."
    },
    "issueTracking": {
      "value": true,
      "status": "good",
      "explanation": "GitHub issue tracking is enabled."
    },
    "openWorkItems": {
      "value": 0,
      "status": "info",
      "explanation": "This count includes open issues and pull requests. It is informational, not a quality score."
    },
    "documentation": {
      "value": true,
      "status": "good",
      "explanation": "A README file was found in the repository."
    },
    "codebase": {
      "value": {},
      "status": "info",
      "explanation": "File counts and language distribution describe repository composition, not code quality."
    },
    "analysisCompleteness": {
      "value": "complete",
      "status": "good",
      "explanation": "The complete file tree was retrieved successfully."
    }
  }
}
```

The values shown above are illustrative. Actual results depend on the repository being analyzed.

---

## 9. Project Structure

```text
CodePulse/
│
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── controllers/
│   │   ├── analysisController.js
│   │   └── repositoryController.js
│   ├── routes/
│   │   └── repositoryRoutes.js
│   ├── services/
│   │   └── githubService.js
│   ├── utils/
│   │   ├── activityAnalyzer.js
│   │   ├── anomalyAnalyzer.js
│   │   ├── fileAnalyzer.js
│   │   ├── githubValidator.js
│   │   └── healthAnalyzer.js
│   ├── server.js
│   └── package.json
│
├── README.md
└── .gitignore
```

The structure may expand as additional modules are implemented.

---

## 10. Development Setup

### Prerequisites

- Node.js
- npm
- Git
- A GitHub account
- A modern web browser

### Clone the Repository

```bash
git clone https://github.com/saurabhsahu-code/CodePulse.git

cd CodePulse
```

### Start the Backend

```bash
cd server

npm install

npm run dev
```

The backend runs at:

`http://localhost:5000`

### Start the Frontend

Open another terminal:

```bash
cd client

npm install

npm run dev
```

The frontend runs at:

`http://localhost:5173`

### Verify the Backend

Open:

`http://localhost:5000/api/health`

A successful response indicates that the backend API is running.

---

## 11. Development Approach

CodePulse follows an incremental development workflow:

1. Project planning and environment configuration.
2. Frontend and backend foundation.
3. GitHub repository integration and data collection.
4. Repository file-tree analysis.
5. Repository health indicators.
6. File-size anomaly detection.
7. Live dashboard integration.
8. Language distribution and codebase visualization.
9. Repository activity analysis.
10. Explainable insights and advanced analysis.
11. Testing, refinement, documentation, and deployment.

Each module is developed, tested, reviewed, and documented before moving to the next stage.

---

## 12. Current Project Status

| Component | Status |
|---|---|
| Repository setup | Completed |
| Initial documentation | Implemented |
| Frontend foundation | Implemented |
| Backend foundation | Implemented |
| GitHub repository validation | Implemented and tested |
| Repository metadata retrieval | Implemented and tested |
| File-tree analysis | Implemented and tested |
| Repository health indicators | Implemented and tested |
| File-size anomaly detection | Implemented and tested |
| Explainable anomaly results | Implemented |
| Live repository overview dashboard | Implemented and tested |
| Repository health dashboard | Implemented and tested |
| File-size anomaly dashboard | Implemented and tested |
| Language distribution visualization | Implemented and tested |
| Repository activity analysis | Implemented and tested |
| Repository activity dashboard | Implemented and tested |
| Advanced recommendations | Planned |
| Database integration | Planned |
| Historical monitoring | Planned |
| Advanced AI/ML analysis | Planned |
| Deployment | Planned |

---

## 13. Project Vision

The long-term vision of CodePulse is to make repository health easier to understand by combining meaningful software metrics, statistical anomaly detection, repository activity analysis, visual codebase analytics, and explainable recommendations in one platform.

CodePulse is intended to complement existing development and code-quality tools rather than simply duplicate their functionality.

The goal is to help developers move beyond raw repository statistics and understand what those statistics mean for software quality and maintenance.

---

**Project:** CodePulse
**Category:** Software Development / Repository Analytics
**Development Status:** Active Development
**Repository:** https://github.com/saurabhsahu-code/CodePulse
