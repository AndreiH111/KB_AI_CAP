/*global QUnit*/

sap.ui.define([
	"com/takeda/kbaipoc/controller/DataSource.controller"
], function (Controller) {
	"use strict";

	QUnit.module("DataSource Controller");

	QUnit.test("I should test the DataSource controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
