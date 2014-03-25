'use strict';

beforeEach(function() {
	this.addMatchers({
		toHaveClass: function(input) {
			return this.actual.hasClass(input);
		},
		toMatch: function(input) {
			return this.actual.is(input);
		},
		toBeArray: function(){
			return $.isArray(this.actual);
		},
		toBeFunction: function(){
			return $.isFunction(this.actual);
		},
		toExist: function(){
			return !!this.actual.length;
		},
		toNotExist: function(){
			return !this.actual.length;
		},
		toHaveReaderStructure: function(){
			var id = this.actual.attr('id');
			return !!this.actual.parents('#' + id + '_wrap').length &&
				!!this.actual.parent().siblings('#cpr-header').length &&
				!!this.actual.parent().siblings('#cpr-footer').length;
		}
	});
});

beforeEach(function(){
	// mock all ajax requests and return empty promise
	// can and should be be overwritten for each specific test
	spyOn( $, 'ajax' ).andCallFake( function () { 
		return $.Deferred().promise();
	});
});
