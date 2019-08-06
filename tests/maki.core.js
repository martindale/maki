'use strict';

const assert = require('assert');

const Maki = require('../');
const Fabric = require('@fabric/core');

describe('Maki', function () {
  it('should expose a constructor', function () {
    assert.equal(typeof Maki, 'function');
  });

  it('should start and stop cleanly', async function () {
    let app = new Maki();
    await app.start();
    await app.stop();
    assert.ok(app);
  });

  it('should create a testable demo app', async function () {
    let app = new Maki();
    let remote = new Fabric.Remote({
      authority: 'localhost',
      host: 'localhost',
      port: 9999
    });

    app.define('Example', {
      name: 'Example',
      components: {
        'list': 'maki-example-list',
        'view': 'maki-example-view'
      }
    });

    await app.start();

    let posted = await app._POST(`/examples`, {
      name: 'Foo'
    });
    console.log('posted:', posted);

    let result = await app._GET(posted);

    await app.stop();

    assert.ok(app);
  });
});
