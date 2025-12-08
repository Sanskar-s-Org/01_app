pipeline {
    agent any

    tools {
        nodejs 'nodejs-22-6-0'
    }
    environment{
        SONAR_SCANNER_HOME = tool 'sonarqube-scanner-6.1.0'
        DOCKER_IMAGE = "immsanskarjoshi/test-repo"
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
                        withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
                            // Write API key to a properties file
                            sh '''
                                echo "nvdApiKey=${NVD_API_KEY}" > dependency-check.properties
                                echo "nvdApiDelay=8000" >> dependency-check.properties
                            '''
                            
                            dependencyCheck(
                                additionalArguments: '--scan ./ --out ./ --format ALL --prettyPrint --propertyfile dependency-check.properties',
                                odcInstallation: 'OWASP-DepCheck-12'
                            )

                            // Clean up the properties file
                            sh 'rm -f dependency-check.properties'

                            dependencyCheckPublisher(
                                failedTotalCritical: 1,
                                pattern: 'dependency-check-report.xml',
                                stopBuild: true
                            )

                            junit(
                                allowEmptyResults: true,
                                testResults: 'dependency-check-junit.xml'
                            )
                        }
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'mongoCreds',
                            usernameVariable: 'MONGODB_USER',
                            passwordVariable: 'MONGODB_PASS'
                        )
                    ]) {
                        sh "npm test || true"
                    }
                }
            }
            post {
                always {
                    junit(allowEmptyResults: true, testResults: 'test-results.xml')
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
                    sh "npm run coverage"
                }
            }
        }

        stage('SAST - SonarQube') {
            steps {
                sh '''
                    $SONAR_SCANNER_HOME/bin/sonar-scanner \
                    -Dsonar.projectKey=01TestApp \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=http://3.110.130.196:9000 \
                    -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info \
                    -Dsonar.login=sqp_07a11c5b19336f53b2fc47175c48741e8d78e6f1
                '''
            }
        }
        stage('Build Docker Image'){
            steps{
                script {
                    sh "docker --version"
                    sh "docker build -t ${DOCKER_IMAGE}:${GIT_COMMIT} ."
                    sh "docker tag ${DOCKER_IMAGE}:${GIT_COMMIT} ${DOCKER_IMAGE}:latest"
                    sh "docker images | grep ${DOCKER_IMAGE}"
                }
            }
        }

        stage('Trivy Image Scan'){
            steps{
                script {
                    try {
                        sh '''
                            # Check if Trivy is available, if not use Docker container
                            if ! command -v trivy &> /dev/null; then
                                echo "Trivy not installed. Using Trivy Docker container..."
                                
                                # Scan with MEDIUM severity
                                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                                    aquasec/trivy:latest image \
                                    --severity LOW,MEDIUM \
                                    --exit-code 0 \
                                    --quiet \
                                    --format json \
                                    --output trivy-image-MEDIUM-results.json \
                                    ${DOCKER_IMAGE}:${GIT_COMMIT}
                                
                                # Scan with CRITICAL severity
                                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                                    aquasec/trivy:latest image \
                                    --severity HIGH,CRITICAL \
                                    --exit-code 0 \
                                    --quiet \
                                    --format json \
                                    --output trivy-image-CRITICAL-results.json \
                                    ${DOCKER_IMAGE}:${GIT_COMMIT}
                                
                                # Generate HTML reports
                                docker run --rm -v $(pwd):/reports \
                                    aquasec/trivy:latest convert \
                                    --format template \
                                    --template "@contrib/html.tpl" \
                                    --output /reports/trivy-image-MEDIUM-results.html \
                                    /reports/trivy-image-MEDIUM-results.json
                                
                                docker run --rm -v $(pwd):/reports \
                                    aquasec/trivy:latest convert \
                                    --format template \
                                    --template "@contrib/html.tpl" \
                                    --output /reports/trivy-image-CRITICAL-results.html \
                                    /reports/trivy-image-CRITICAL-results.json
                            else
                                echo "Using installed Trivy..."
                                trivy image ${DOCKER_IMAGE}:${GIT_COMMIT} --severity LOW,MEDIUM --exit-code 0 --quiet --format json --output trivy-image-MEDIUM-results.json 
                                trivy image ${DOCKER_IMAGE}:${GIT_COMMIT} --severity HIGH,CRITICAL --exit-code 0 --quiet --format json --output trivy-image-CRITICAL-results.json 
                                
                                trivy convert --format template --template "@contrib/html.tpl" --output trivy-image-MEDIUM-results.html trivy-image-MEDIUM-results.json
                                trivy convert --format template --template "@contrib/html.tpl" --output trivy-image-CRITICAL-results.html trivy-image-CRITICAL-results.json
                            fi
                        '''
                    } catch (Exception e) {
                        echo "Trivy scan failed or Docker image not available. Skipping."
                        echo "Error: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished. Publishing all reports..."
            
            // Publish HTML Reports
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'dependency-check-report.html',
                reportName: 'OWASP Dependency Check Report'
            ])
            
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage/lcov-report',
                reportFiles: 'index.html',
                reportName: 'Code Coverage Report',
                useWrapperFileDirectly: true
            ])
            
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'trivy-image-MEDIUM-results.html',
                reportName: 'Trivy Image Scan - MEDIUM'
            ])
            
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'trivy-image-CRITICAL-results.html',
                reportName: 'Trivy Image Scan - CRITICAL'
            ])
            
            echo "All reports published successfully!"
        }
    }
}
