const IS_HTTPS_MODE = !process.argv.slice(2).includes("http");

export default IS_HTTPS_MODE;