import { assert } from 'chai';
import 'mocha';
import fetch from 'node-fetch';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { HttpRequestFetch } from '../src/http-request-fetch';
import { Client } from '../src/index';

describe.only('jmap-client-ts', () => {
  let WEBADMIN_URL: string;
  let SESSION_URL: string;
  let OVERRIDDEN_API_URL: string;
  const USERNAME = 'u1@localhost';
  const PASSWORD = 'u1password';
  const BASIC_AUTH_HEADER = {
    Authorization: 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`),
  };
  let container: StartedTestContainer;
  let client: Client;

  before((done) => {
    new GenericContainer('linagora/james-memory', 'branch-master')
      .withExposedPorts(80, 8000)
      .start()
      .then((startedContainer) => {
        container = startedContainer;
        WEBADMIN_URL = `http://${container.getHost()}:${container.getMappedPort(
          8000
        )}`;
        SESSION_URL = `http://${container.getHost()}:${container.getMappedPort(
          80
        )}/jmap/session`;
        OVERRIDDEN_API_URL = `http://${container.getHost()}:${container.getMappedPort(
          80
        )}/jmap`;
        console.log('Container started');
        return fetch(`${WEBADMIN_URL}/users/${USERNAME}`, {
          method: 'PUT',
          body: `{ "password": "${PASSWORD}" }`,
        });
        // TODO Throw error if not 2XX
      })
      .then(() => {
        console.log('User added');
        client = new Client({
          sessionUrl: SESSION_URL,
          accessToken: '',
          httpHeaders: BASIC_AUTH_HEADER,
          overriddenApiUrl: OVERRIDDEN_API_URL,
          httpRequest: new HttpRequestFetch(),
        });
        return client.fetchSession();
        // TODO Throw error if not 2XX (in fetchSession)
      })
      .then(() => {
        console.log('Session fetched');
        done();
      })
      .catch(done);
  });

  after((done) => {
    container.stop().then(() => done());
  });

  it('should have mailbox_get working', (done) => {
    client
      .mailbox_get({
        accountId: client.getAccountIds()[0],
        ids: null,
      })
      .then(() => {
        assert(true);
        done();
      })
      .catch(() => {
        assert(false);
        done();
      });
  });
});
