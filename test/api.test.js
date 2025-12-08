const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('API Integration Tests', () => {
    describe('GET /health', () => {
        it('should return 200 OK', (done) => {
            request(app)
                .get('/health')
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body.status).to.equal('ok');
                    done();
                });
        });
    });

    describe('GET /api/articles', () => {
        it('should return a list of articles', (done) => {
            request(app)
                .get('/api/articles')
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('articles');
                    expect(res.body.articles).to.be.an('array');
                    expect(res.body.articlesCount).to.be.a('number');
                    done();
                });
        });
    });

    describe('POST /api/users/login', () => {
        it('should login successfully with correct credentials', (done) => {
            request(app)
                .post('/api/users/login')
                .send({
                    user: {
                        email: 'jake@jake.jake',
                        password: 'jakejake'
                    }
                })
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body.user).to.have.property('token');
                    expect(res.body.user.email).to.equal('jake@jake.jake');
                    done();
                });
        });

        it('should fail with incorrect credentials', (done) => {
            request(app)
                .post('/api/users/login')
                .send({
                    user: {
                        email: 'wrong@email.com',
                        password: 'wrongpassword'
                    }
                })
                .expect(422)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('errors');
                    done();
                });
        });

        it('should fail with correct email but wrong password', (done) => {
            request(app)
                .post('/api/users/login')
                .send({
                    user: {
                        email: 'jake@jake.jake',
                        password: 'wrongpassword'
                    }
                })
                .expect(422)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('errors');
                    done();
                });
        });

        it('should fail when user object is missing', (done) => {
            request(app)
                .post('/api/users/login')
                .send({})
                .expect(422)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('errors');
                    done();
                });
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent routes', (done) => {
            request(app)
                .get('/api/does-not-exist')
                .expect(404)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body.error).to.equal('Not Found');
                    done();
                });
        });

        it('should handle malformed JSON', (done) => {
            request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send('{"invalid": }') // Malformed JSON
                .expect(400) // Bad Request for malformed JSON
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('error');
                    done();
                });
        });
    });
});
