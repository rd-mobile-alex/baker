import path from 'path';
import assert from 'yeoman-assert';
import helpers from 'yeoman-test';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import fsExtra from 'fs-extra';
import fs from 'fs';
import _ from 'lodash';
import mockery from 'mockery';

const expect = chai.expect;
const appGeneratorModule = path.join(__dirname, '../../app');

describe('generator-rn:app', () => {
  let _generator;
  let _checkIfRNIsInstalledStub = null;
  let _initRNSpy = null;
  let _abortSetupStub = null;
  let _execSyncSpy = null;

  const applicationName = 'MyReactApp';
  const applicationFiles = [
    'app/src/reducers.js',
    'app/src/settings.js',
    'app/src/setup.js',
    'app/src/store.js',
    'app/src/tests.js',
    'app/src/components/App/index.js',
    'app/src/components/App/styles.js',
    'app/src/sagas/index.js',
    'app/index.ios.js',
    'app/index.android.js',
    'app/package.json',
  ];

  const _stubThings = generator => {
    _generator = generator;
    _checkIfRNIsInstalledStub = sinon.stub(generator, '_checkIfRNIsInstalled').returns(true);
    _initRNSpy = sinon.stub(generator, '_initRN').returns(true);
    _abortSetupStub = sinon.stub(generator, '_abortSetup').returns(true);
  };

  const _unstubThings = () => {
    _checkIfRNIsInstalledStub && _checkIfRNIsInstalledStub.restore();
    _initRNSpy && _initRNSpy.restore();
    _abortSetupStub && _abortSetupStub.restore();
  };

  before(() => {
    mockery.enable({
      // warnOnReplace: false,
      warnOnUnregistered: false,
    });

    _execSyncSpy = sinon.spy();

    mockery.registerMock('child_process', {
      execSync(...args) {
        _execSyncSpy.apply(this, args);
      },
    });
  });

  after(() => {
    mockery.disable();
  });

  describe('simple generator', () => {
    before(done => {
      helpers.run(appGeneratorModule)
        .on('ready', _stubThings)
        .on('end', done);
    });

    after(_unstubThings);

    it('checks if react-native is installed', () => {
      expect(_checkIfRNIsInstalledStub.calledOnce).to.be.ok;
    });

    it('runs RN setup script', () => {
      expect(_initRNSpy.calledOnce).to.be.ok;
    });

    it('sets up all the app files', () => {
      assert.file(applicationFiles);
    });

    it('calls child_process.execSync to install app deps', () => {
      expect(_execSyncSpy.getCall(0).args).to.eql([
        'npm install', {
          cwd: _generator.destinationPath('app'),
        },
      ]);
    });

    it('calls child_process.execSync to install server deps', () => {
      expect(_execSyncSpy.getCall(1).args).to.eql([
        'npm install', {
          cwd: _generator.destinationPath('server'),
        },
      ]);
    });

    it('calls child_process.execSync to link to app settings', () => {
      expect(_execSyncSpy.getCall(2).args).to.eql([
        'ln -s app/settings ./settings', {
          cwd: _generator.destinationPath('.'),
        },
      ]);
    });

    it('adds settings directory to the app directory', () => {
      assert.file([
        'app/settings/development/base.json',
        'app/settings/development/android.json',
        'app/settings/development/ios.json',
        'app/settings/production/base.json',
        'app/settings/production/android.json',
        'app/settings/production/ios.json',
      ]);
    });

    it('adds .gitignore with * in app/settings/production', () => {
      assert.file([
        'app/settings/production/.gitignore',
      ]);
      assert.fileContent('app/settings/production/.gitignore', '*');
    });
  });

  describe('running generator in a non-empty directory with something that looks like a RN app', () => {
    before(done => {
      helpers.run(appGeneratorModule)
        .inTmpDir(dir => {
          // XX: make it look like a directory with some RN artifacts
          fs.mkdirSync(path.join(dir, 'android'));
          fs.mkdirSync(path.join(dir, 'ios'));
          fs.writeFileSync(path.join(dir, 'index.ios.js'), '00000000');
          fs.writeFileSync(path.join(dir, 'index.android.js'), '00000000');
        })
        .withPrompts({
          name: applicationName,
        })
        .on('ready', _stubThings)
        .on('end', done);
    });

    after(_unstubThings);

    it('bails on app generation', () => {
      expect(_abortSetupStub.calledOnce).to.be.ok;
    });
  });

  describe('app with server setup', () => {
    before(done => {
      helpers.run(appGeneratorModule)
        .withPrompts({
          name: applicationName,
          addServer: true,
        })
        .on('ready', _stubThings)
        .on('end', done);
    });

    after(_unstubThings);

    it('adds server folder with all the setup', () => {
      assert.file([
        'server/src/index.js',
        'server/package.json',
        'server/Procfile',
        'server/src/graphql/index.js',
        'server/src/graphql/schema.js',
        'server/src/models/Example.js',
        'server/src/parse-server/index.js',
        'server/public/images/logo.png',
        'server/scripts/server-deploy.js',
        'server/scripts/server.js',
      ]);
    });
  });
});
