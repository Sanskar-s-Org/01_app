pipeline {
    agent any

    stages {
        stage('BuildNew') {
            steps {
                echo 'Building...'
                // Add your build steps here, e.g., sh 'mvn clean install'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..'
                // Add your test steps here, e.g., sh 'mvn test'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
                // Add your deployment steps here
            }
        }
    }
}
