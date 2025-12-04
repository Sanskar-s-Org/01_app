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
        stage('NPM Dependencies Audit') {
            steps {
                sh "npm audit --audit-level=critical"
            }
        }
    }
        
}
