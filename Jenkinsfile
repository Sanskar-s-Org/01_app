pipeline {
    agent any

    tools {
        nodejs 'nodejs-22-6-0'
    }

    stages {

        stage('Check Node.js Version') {
            steps {
                sh "node --version"
                sh "npm --version"
            }
        }

        stage('Install Dependencies') {
            steps {
                // Recommended for CI environments
                sh "npm ci --no-audit || npm install --no-audit"
            }
        }

        stage('Security Checks') {
            parallel {

                stage('NPM Dependencies Audit') {
                    steps {
                        sh "npm audit --audit-level=critical"
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        dependencyCheck additionalArguments: """
                            --scan ./
                            --out ./
                            --format ALL
                            --prettyPrint
                        """,
                        odcInstallation: 'OWASP-DepCheck-9'

                        dependencyCheckPublisher(
                            failedTotalCritical: 1,
                            pattern: 'dependency-check-report.xml',
                            stopBuild: true
                        )

                        junit(
                            allowEmptyResults: true,
                            testResults: 'dependency-check-junit.xml'
                        )

                        publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: false,
                            keepAll: true,
                            reportDir: '.',
                            reportFiles: 'dependency-check-report.html',
                            reportName: 'OWASP Dependency Check Report'
                        ])
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'mongoCreds',
                        usernameVariable: 'MONGODB_USER',
                        passwordVariable: 'MONGODB_PASS'
                    )
                ]) {
                    sh "npm test"
                }
            }
        }

        stage('Code Coverage') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'mongoCreds',
                        usernameVariable: 'MONGODB_USER',
                        passwordVariable: 'MONGODB_PASS'
                    )
                ]) {
                    catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', message: 'Coverage below threshold') {
                        sh "npm run coverage"
                    }
                }

                publishHTML([
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'coverage/lcov-report',
                    reportFiles: 'index.html',
                    reportName: 'Code Coverage Report',
                    useWrapperFileDirectly: true
                ])
            }
        }
    }

    post {
        always {
            echo "Pipeline finished. Cleaning workspace..."
        }
    }
}
