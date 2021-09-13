const { getJestProjects } = require('@nrwl/jest');

module.exports = {
  verbose: false,
  projects: getJestProjects(),
};
