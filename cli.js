#!/usr/bin/env node

var dbfix = require('./')

var help = false
var dashdash = false
var args = process.argv.slice(2).filter(function(arg) {
	if (dashdash)
		return !!arg
	else if (arg === '--')
		dashdash = true
	else if (arg.match(/^(-+|\/)(h(elp)?|\?)$/))
		help = true
	else
		return !!arg
});
if (help || args.length === 0) {
	// If they didn't ask for help, then this is not a "success"
	var log = help ? console.log : console.error
	log('Usage: dbfix <path> [<password>]')
	log('')
	log('Options:')
	log('')
	log('  -h, --help    Display this usage info')
	process.exit(help ? 0 : 1)
} else {
	dbfix(args[0], args[1], args[2], function(er) {
		if (er)
			throw er
	})
}