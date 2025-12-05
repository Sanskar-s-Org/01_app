pipeline {
    agent any
    tools
    {
        nodejs 'nodejs-22-6-0'
    }
    stages {
        stage('Check Node js Version') {
            steps {
                sh "node --version"
            }
        }
        stage('Install Dependencies') {
            steps {
                sh "npm install --no-audit"
            }
        }
        parallel {
            stage('NPM Dependencies Audit') {
                steps {
                    sh "npm audit --audit-level=critical"
                }
            }
            stage('OWASP Dependency Check') {
                steps {
                        dependencyCheck additionalArguments: '''
                            --scan \'./\'
                            --out \'./\'
                            --format \'ALL\'
                            --prettyPrint''', odcInstallation: 'OWASP-DepCheck-10'
                        dependencyCheckPublisher failedTotalCritical: 1, pattern: 'dependency-check-report.xml', stopBuild: true
                }
            }
        }
    }
        
}
