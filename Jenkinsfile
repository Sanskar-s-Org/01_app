pipeline {
    agent any
    
    parameters {
        string(
            name: 'EC2_IP_ADDRESS',
            defaultValue: '65.2.70.82',
            description: 'EC2 instance IP address for deployment'
        )
        string(
            name: 'SONARQUBE_IP',
            defaultValue: '3.110.187.20',
            description: 'SonarQube server IP address'
        )
    }
    
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
                    -Dsonar.host.url=http://${SONARQUBE_IP}:9000 \
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
                            echo "Running Trivy security scan..."
                            
                            # Scan with MEDIUM severity using HTML template
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --severity LOW,MEDIUM \
                                --exit-code 0 \
                                --format template \
                                --template "@contrib/html.tpl" \
                                -o trivy-image-MEDIUM-report.html \
                                ${DOCKER_IMAGE}:${GIT_COMMIT}
                            
                            # Copy the HTML report to workspace
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                -v $(pwd):/output \
                                aquasec/trivy:latest image \
                                --severity LOW,MEDIUM \
                                --exit-code 0 \
                                --format template \
                                --template "@contrib/html.tpl" \
                                ${DOCKER_IMAGE}:${GIT_COMMIT} > trivy-image-MEDIUM-report.html
                            
                            # Scan with CRITICAL severity using HTML template
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --severity HIGH,CRITICAL \
                                --exit-code 0 \
                                --format template \
                                --template "@contrib/html.tpl" \
                                ${DOCKER_IMAGE}:${GIT_COMMIT} > trivy-image-CRITICAL-report.html
                            
                            # Generate JSON reports for archiving
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --severity LOW,MEDIUM,HIGH,CRITICAL \
                                --exit-code 0 \
                                --format json \
                                ${DOCKER_IMAGE}:${GIT_COMMIT} > trivy-image-full-results.json
                            
                            echo "Trivy scan completed successfully!"
                            echo "Generated files:"
                            ls -lah trivy-image-*.html trivy-image-*.json
                        '''
                    } catch (Exception e) {
                        echo "Trivy scan failed. Skipping."
                        echo "Error: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        stage('Push to Docker Hub'){
            steps{
                withDockerRegistry(credentialsId: 'dockerhub-creds', url: 'https://index.docker.io/v1/') {
                    sh 'docker push ${DOCKER_IMAGE}:${GIT_COMMIT}'
                    sh 'docker push ${DOCKER_IMAGE}:latest'
                }
            }

        }
        stage('Deploy AWS EC2'){
            when {
                branch 'feature/*'
            }
            steps{
                script{
                    withCredentials([
                    usernamePassword(
                        credentialsId: 'mongoCreds',
                        usernameVariable: 'MONGODB_USER',
                        passwordVariable: 'MONGODB_PASS'
                    )
                ]){
                    sshagent(['aws-dev-deploy-ec2-instance']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ec2-user@${EC2_IP_ADDRESS} "
                            if sudo docker ps -a | grep -q 'sample-app'; then
                                echo 'Container found. Stopping...'
                                sudo docker stop sample-app && sudo docker rm sample-app
                                echo 'Container stopped and removed'
                            fi
                            sudo docker run --name sample-app \
                                -p 3000:3000 \
                                -e MONGODB_USER=${MONGODB_USER} \
                                -e MONGODB_PASS=${MONGODB_PASS} \
                                -d ${DOCKER_IMAGE}:${GIT_COMMIT}
                        "
                    '''
                }
                }
                }
            }
        }
        stage('Integration Testing') {
            when {
                branch 'feature/*'
            }
            steps {
                script {
                    echo "Installing required tools for integration testing..."
                    sh '''
                        set -e
                        
                        # Check curl availability
                        if command -v curl >/dev/null 2>&1; then
                            echo "✓ curl is available"
                        else
                            echo "ERROR: curl not found"
                            exit 1
                        fi
                        
                        # Install jq locally if not present
                        if command -v jq >/dev/null 2>&1; then
                            echo "✓ jq is available"
                        else
                            echo "Installing jq locally..."
                            mkdir -p $HOME/bin
                            curl -L https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 -o $HOME/bin/jq
                            chmod +x $HOME/bin/jq
                            echo "✓ jq installed to $HOME/bin/jq"
                        fi
                        
                        # Install AWS CLI v2 locally if not present
                        if command -v aws >/dev/null 2>&1 || [ -f "$HOME/bin/aws" ]; then
                            echo "✓ AWS CLI is available"
                        else
                            echo "Installing AWS CLI v2 locally..."
                            rm -rf aws awscliv2.zip
                            curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
                            unzip -o -q awscliv2.zip
                            ./aws/install -i $HOME/aws-cli -b $HOME/bin --update
                            rm -rf aws awscliv2.zip
                            echo "✓ AWS CLI installed to $HOME/bin/aws"
                        fi
                        
                        # Verify installations
                        echo ""
                        echo "Tool versions:"
                        curl --version | head -n1
                        if [ -f "$HOME/bin/jq" ]; then
                            $HOME/bin/jq --version
                        else
                            jq --version
                        fi
                        if [ -f "$HOME/bin/aws" ]; then
                            $HOME/bin/aws --version
                        else
                            aws --version
                        fi
                    '''
                    
                    echo "Running integration tests against deployed EC2 instance..."
                    sh '''
                        # Ensure tools are in PATH
                        export PATH=$HOME/bin:$PATH
                        chmod +x integration-testing-ec2.sh
                        ./integration-testing-ec2.sh
                    '''
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
            
            // Publish Trivy MEDIUM severity HTML report
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'trivy-image-MEDIUM-report.html',
                reportName: 'Trivy MEDIUM Severity Report'
            ])
            
            // Publish Trivy CRITICAL severity HTML report
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'trivy-image-CRITICAL-report.html',
                reportName: 'Trivy CRITICAL Severity Report'
            ])
            
            // Archive Trivy JSON results for further processing
            archiveArtifacts artifacts: 'trivy-image-*.json', allowEmptyArchive: true
            
            echo "All reports published successfully!"
        }
    }
}
