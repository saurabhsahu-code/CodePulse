# CodePulse

### Repository Health Monitoring and Explainable Anomaly Detection

CodePulse is a web-based repository analysis platform designed to help developers understand the health, maintainability, and potential risks of their software projects.

It transforms repository information into understandable insights through structured analysis, transparent health indicators, and explainable anomaly detection.

**Development status:** Active development

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
- Present repository insights through a visual dashboard.
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
- Initial dashboard interface.
- Reusable Header and Sidebar components.
- Basic dashboard layout and styling.

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

### Planned Features

The following features are part of the intended product scope and are not yet fully implemented:

- **Explainable Insights:** Extend explanations and provide more context about detected repository concerns.
- **Advanced Recommendations:** Provide actionable suggestions based on analysis results.
- **Historical Monitoring:** Track changes in repository health over time.
- **Advanced Analysis:** Extend repository analysis with additional maintainability and code-quality metrics.
- **Dashboard Integration:** Present live repository analysis, health indicators, and anomaly results through the frontend.
- **Database Integration:** Store repository analysis results and historical data.
- **AI/ML Exploration:** Evaluate whether machine-learning techniques can improve future repository analysis and recommendations.

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | User interface |
| Build Tool | Vite | Frontend development and build |
| Styling | CSS | Dashboard styling |
| Backend | Node.js | Server-side execution |
| API Framework | Express.js | REST API development |
| Repository Integration | GitHub REST API | Repository data retrieval |
| Version Control | Git and GitHub | Source-code management |
| Analysis Engine | JavaScript | Repository file, health, and anomaly analysis |
| Statistical Method | Log-transformed IQR | File-size outlier detection |
| Database | MongoDB | Planned data persistence |
| Visualization | To be selected | Dashboard charts and metrics |
| AI/ML | To be evaluated | Future anomaly detection and recommendations |

Technology selections may evolve as development progresses.

---

## 6. Current Repository Analysis

CodePulse currently supports analysis of publicly accessible GitHub repositories.

The file-tree analysis provides the following information:

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

### Current Limitations

- Maintenance activity uses the last push date and does not independently measure development quality.
- Open work-item counts include issues and pull requests and are informational only.
- README detection checks filenames in the analyzed file tree; it does not evaluate documentation quality.
- Language classification is based on file extensions. It does not inspect source-code contents or reproduce GitHub Linguist's language-detection algorithm.
- A truncated GitHub file tree can affect the completeness of analysis.
- Health indicators are heuristic assessments, not definitive measurements of software quality.
- Advanced recommendations, historical monitoring, database persistence, and AI/ML-based recommendations are not yet implemented.

---

## 7. Backend API

The current backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend welcome route |
| GET | `/api/health` | API health check |
| POST | `/api/repositories/validate` | Validate a GitHub repository URL |
| POST | `/api/repositories/analyze` | Retrieve repository metadata and analyze its file tree, health indicators, and file-size anomalies |

### Repository Analysis Request

**Endpoint:**

`POST /api/repositories/analyze`

**Request body:**

```json
{
  "repositoryUrl": "https://github.com/facebook/react"
}
```

The successful response contains four main data sections:

- **metadata:** Repository details retrieved from GitHub.
- **tree:** File counts, language distribution, README detection, and file-tree completeness.
- **health:** Overall health status and seven individual health indicators with values, statuses, and explanations.
- **anomalies:** File-size anomaly detection status, statistical method, language-specific thresholds, detected files, and explanations.

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

## 8. Project Structure

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

## 9. Development Setup

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

## 10. Development Approach

CodePulse follows an incremental development workflow:

1. Project planning and environment configuration.
2. Frontend and backend foundation.
3. GitHub repository integration and data collection.
4. Repository file-tree analysis.
5. Repository health indicators.
6. File-size anomaly detection.
7. Explainable insights and advanced analysis.
8. Dashboard integration and visualization.
9. Testing, refinement, documentation, and deployment.

Each module is developed, tested, reviewed, and documented before moving to the next stage.

---

## 11. Current Project Status

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
| Advanced recommendations | Planned |
| Dashboard integration with live analysis | Pending |
| Database integration | Pending |
| Historical monitoring | Pending |
| Testing and deployment | In progress |

---

## 12. Project Vision

The long-term vision of CodePulse is to make repository health easier to understand by combining meaningful software metrics, statistical anomaly detection, and explainable recommendations in one platform.

CodePulse is intended to complement existing development and code-quality tools rather than simply duplicate their functionality.

The goal is to help developers move beyond raw repository statistics and understand what those statistics mean for software quality and maintenance.

---
**Project:** CodePulse
**Category:** Software Development / Repository Analytics
**Development Status:** Active Development
**Repository:** https://github.com/saurabhsahu-code/CodePulse
