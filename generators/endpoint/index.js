'use strict';
var util 				= require('util');
var yeoman 			= require('yeoman-generator');
var yosay 			= require('yosay');
var path 				= require('path');
var fs 					= require('fs');
var inflection 	= require('inflection');

var MARKER = "/* Add new methods above */";

var RouteGenerator = yeoman.generators.Base.extend({
	init: function () {

		// Have Yeoman reiterate what the user did
		if (this.arguments[0]) {
			this.log(yosay('You called the endpoint subgenerator with the argument "' + this.arguments[0] + '".'));
		} else {
			this.log(yosay('You called the endpoint subgenerator with no arguments.'));
		}
	},

	// Prompt the user if they did not enter a module name
	promptTask: function() {

		var prompts = [
			{
				type: 'input',
				name: 'route',
				message: 'Enter your endpoint url (Example: /items or /items/:id)',
				required: true
			},
			{
				type: 'list',
				name: 'methodType',
				message: 'What type of method is this endpoint?',
				choices: ["GET", "POST", "PUT", "DELETE"]
			},
			{
				type: 'input',
				name: 'description',
				message: 'Give a brief description of this endpoint?'
			},
			{
				type: 'input',
				name: 'handler',
				message: 'What would you like to name your method handler? (Examples: upsert, findByKey, deleteByName)'
			}
		];

		// If a module name was passed in to the generator use it, else add a prompt to the user for the module name
		if (this.arguments[0]) {
			this.module = this.arguments[0];
		} else {
			// Add the module prompt as the 2nd prompt
			prompts.splice(1, 0, {
				type: 'input',
				name: 'module',
				message: 'What module would you like to add your endpoint to?',
				required: true
			})
		}

		var done = this.async();

		this.prompt(prompts, function (answers) {
			this.route = answers.route;
			this.module = answers.module;
			this.methodType = answers.methodType;
			this.description = answers.description;
			this.handler = answers.handler;
			done();
		}.bind(this));

	},

	// Copy the code for the new endpoint to the ctrl, service, and dao files
	files: function () {

		var module = inflection.singularize(this.module);
		var pluralModule = inflection.pluralize(this.module);
		this.controllerName = inflection.camelize( this.module, true ) + 'Controller';
		this.serviceName = inflection.camelize( this.module, true ) + 'Service';
		this.daoName = inflection.camelize( this.module, true ) + 'Dao';

		// THE INDENTATION OF THIS VARIABLE IS IMPORTANT EVEN THOUGH IT LOOKS MESSY AS HELL
		var ctrlToAdd = ",\n\
		\n\
		{\n\
			method: '" + this.methodType + "',\n\
			path: '" + this.route + "',\n\
			config : {\n\
				description: '" + this.description + "',\n\
				handler: function (req, reply) {\n\
					" + this.serviceName + "." + this.handler + "(req.params.id, function (err, data) {\n\
						if (err) {\n\
							return reply(Boom.wrap(err));\n\
						}\n\
						reply(data);\n\
					});\n\
				}\n\
			}\n\
		}";

		// THE INDENTATION OF THIS VARIABLE IS IMPORTANT EVEN THOUGH IT LOOKS MESSY AS HELL
		var serviceToAdd = "\
/**\n\
 * " + this.description + "\n\
 *\n\
 * @param id\n\
 * @param callback\n\
 */\n\
exports." + this.handler + " = function (id, callback) {\n\
\n\
	" + this.daoName + "." + this.handler + "(id, function (err, data) {\n\
		if (err) {\n\
			return callback(Boom.wrap(err));\n\
		}\n\
		\n\
		callback(null, data);\n\
	});\n\
};\n\
";

		// THE INDENTATION OF THIS VARIABLE IS IMPORTANT EVEN THOUGH IT LOOKS MESSY AS HELL
		var daoToAdd = "\
/**\n\
 * " + this.description + "\n\
 *\n\
 * @param id\n\
 * @param callback\n\
 */\n\
exports." + this.handler + " = function(id, callback) {\n\
	// TODO: Implement dao method and call callback(null, <data>)\n\
	return callback(Boom.notImplemented());\n\
};\n\
";

		// TODO: Refactor this into method and figure out how to get endpoint comma to start after last endpoint and not two lines past it
		var ctrlPath = path.resolve(process.cwd(), 'modules', pluralModule, module + "-ctrl-routes.js");
		var servicePath = path.resolve(process.cwd(), 'modules', pluralModule, module + "-service.js");
		var daoPath = path.resolve(process.cwd(), 'modules', pluralModule, module + "-dao.js");
		var ctrlSrc = fs.readFileSync(ctrlPath, 'utf8');
		var serviceSrc = fs.readFileSync(servicePath, 'utf8');
		var daoSrc = fs.readFileSync(daoPath, 'utf8');
		var indexOfCtrl = ctrlSrc.indexOf(MARKER);
		var indexOfService = serviceSrc.indexOf(MARKER);
		var indexOfDao = daoSrc.indexOf(MARKER);
		var lineStartService = serviceSrc.substring(0, indexOfService).lastIndexOf('\n') + 1;
		var lineStartCtrl = ctrlSrc.substring(0, indexOfCtrl).lastIndexOf('\n') + 1;
		var lineStartDao = daoSrc.substring(0, indexOfDao).lastIndexOf('\n') + 1;
		var indentService = serviceSrc.substring(lineStartService,indexOfService);
		var indentCtrl = ctrlSrc.substring(lineStartCtrl,indexOfCtrl);
		var indentDao = daoSrc.substring(lineStartDao,indexOfDao);
		serviceSrc = serviceSrc.substring(0,indexOfService) + serviceToAdd + "\n" + indentService + serviceSrc.substring(indexOfService);
		ctrlSrc = ctrlSrc.substring(0,indexOfCtrl) + ctrlToAdd + "\n" + indentCtrl + ctrlSrc.substring(indexOfCtrl);
		daoSrc = daoSrc.substring(0,indexOfDao) + daoToAdd + "\n" + indentDao + daoSrc.substring(indexOfDao);
		fs.writeFileSync(servicePath,serviceSrc);
		fs.writeFileSync(ctrlPath,ctrlSrc);
		fs.writeFileSync(daoPath,daoSrc);

	}
});

module.exports = RouteGenerator;