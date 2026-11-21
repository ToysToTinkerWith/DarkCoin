// Builds and simulates a review package. Never signs or submits a transaction.
const { prepareReview } = require('./council-activation.cjs');
if (require.main === module) prepareReview({network:process.argv[2] || 'mainnet',registryFile:process.argv[3]})
  .then(value => console.log(JSON.stringify(value,null,2)))
  .catch(error => {console.error(error.message);process.exitCode=1;});
module.exports={prepareReview};
