# CodePulse

### Repository Health Monitoring and Explainable Anomaly Detection

CodePulse is a web-based repository analysis platform designed to help developers understand the health, maintainability, and potential risks of their software projects.

It aims to transform repository information into understandable insights through structured analysis, visual indicators, and explainable recommendations.

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
- Repository information including name, owner, description, stars, forks, default branch, and primary language.
- Error handling for invalid URLs, unavailable repositories, and API rate limits.

**4. Repository File-Tree Analysis**
- Recursive GitHub repository file-tree retrieval.
- Total file and directory counting.
- File-extension distribution.
- Source-code and supporting-file classification.
- Programming-language distribution based on file extensions.
- Exclusion of selected generated and dependency directories.
- Detection of incomplete GitHub file-tree responses.

### Planned Features

The following features are part of the intended product scope and are not yet fully implemented:

- **Repository Health Dashboard:** Present meaningful repository health indicators.
- **Anomaly Detection:** Identify unusual patterns in repository metrics.
- **Explainable Insights:** Explain why a potential issue or anomaly has been identified.
- **Maintenance Indicators:** Highlight areas that may require developer attention.
- **Recommendations:** Provide actionable suggestions based on analysis results.
- **Historical Monitoring:** Track changes in repository health over time.
- **Advanced Analysis:** Extend repository analysis with additional maintainability and code-quality metrics.

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
| Analysis Engine | JavaScript | Repository file analysis |
| Database | MongoDB | Planned data persistence |
| Visualization | To be selected | Dashboard charts and metrics |
| AI/ML | To be evaluated | Future anomaly detection and recommendations |

Technology selections may evolve as development progresses.

## 6. Current Repository Analysis

CodePulse currently supports analysis of publicly accessible GitHub repositories.

The analysis provides the following information:

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
| Completeness | Whether GitHub returned a complete file tree |

**Current limitation:** Programming-language classification is based on file extensions. It does not yet inspect source-code contents or reproduce GitHub Linguist's language-detection algorithm.

## 7. Backend API

The current backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend welcome route |
| GET | `/api/health` | API health check |
| POST | `/api/repositories/validate` | Validate a GitHub repository URL |
| POST | `/api/repositories/analyze` | Retrieve repository metadata and analyze its file tree |

### Repository Analysis Request

**Endpoint:**

`POST /api/repositories/analyze`

**Request body:**

```json
{
  "repositoryUrl": "https://github.com/facebook/react"
}
```

The response includes repository metadata and file-tree analysis results.

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
│   │   ├── fileAnalyzer.js
│   │   └── githubValidator.js
│   ├── server.js
│   └── package.json
│
├── README.md
└── .gitignore
```

The structure may expand as additional modules are implemented.

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

## 10. Development Approach

CodePulse follows an incremental development workflow:

1. Project planning and environment configuration.
2. Frontend and backend foundation.
3. GitHub repository integration and data collection.
4. Repository file-tree analysis.
5. Repository health indicators.
6. Anomaly detection and explainable insights.
7. Dashboard integration and visualization.
8. Testing, refinement, documentation, and deployment.

Each module is developed, tested, reviewed, and documented before moving to the next stage.

## 11. Current Project Status

| Component | Status |
|---|---|
| Repository setup | Completed |
| Initial documentation | In progress |
| Frontend foundation | Implemented |
| Backend foundation | Implemented |
| GitHub repository validation | Implemented and tested |
| Repository metadata retrieval | Implemented and tested |
| File-tree analysis | Implemented and tested |
| Repository health indicators | Planned |
| Anomaly detection | Planned |
| Explainable insights | Planned |
| Dashboard integration with live analysis | Pending |
| Database integration | Pending |
| Testing and deployment | Pending |

## 12. Project Vision

The long-term vision of CodePulse is to make repository health easier to understand by combining meaningful software metrics, anomaly detection, and explainable recommendations in one platform.

CodePulse is intended to complement existing development and code-quality tools rather than simply duplicate their functionality.

The goal is to help developers move beyond raw repository statistics and understand what those statistics mean for software quality and maintenance.

---

**Project:** CodePulse  
**Category:** Software Development / Repository Analytics  
**Development Status:** Active Development
**Repository:** https://github.com/saurabhsahu-code/CodePulse