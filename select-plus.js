(function($){
	$.fn.selectplus = function(options){
		// default options
		var settings = $.extend({
			remote: {
				url: null,
				pageSize: {label: null, value: 10},
				page: {label: null, value:1},
				root: null,
				label: null,
				value: null,
				hint: 'Type a searchterm',
				minchar: 3
			}
		}, options);

		// functions and variables used for selectplus
		var modules = {
			// for storing the select element data
			data: {},

			// data for the raw input element
			element: {},

			// for keeping track the remote feed
			remote: {
				page: 1,
				eof: false
			},

			// pointer to the contructed select elements
			ui: {},

			// read the local select's options
			parseElement: function(element){
				var selectArray = [];

				// iterate through the select's children
				element.children().each(function(){

					if($(this).is('option')){ // if it is an option element
						selectArray.push({lbl: $(this).text(), val: $(this).val()});
					}else if($(this).is('optgroup')){ // if it is an option group
						var optgroup = [];
						// iterate through the option group's children
						$(this).children().each(function(){
							if($(this).is('option')){
								optgroup.push({lbl: $(this).text(), val: $(this).val()});
							}
						});
						selectArray.push({val: optgroup, lbl: $(this).attr('label')});
					}
				});
				modules.data.local = selectArray;
			},

			// recontruct the select element with divs
			constructElement: function(element){
				var id = modules.element.id;
				var name = modules.element.name;

				// anchor element
				modules.helper.divBuilder('anchor', element, 'select-anchor', id+'-anchor', true);

				// root element
				modules.helper.divBuilder('root', modules.ui.anchor, 'select-container', id+'-ui');

				// original form element (now as a hidden element)
				modules.ui.root.append('<input type="hidden" id="'+id+'" />');
				modules.ui.raw = $('#'+id);
				if(_.isUndefined(modules.elementName)){
					modules.ui.raw.attr('name', modules.elementName);
				}

				// select element (defaults to first item on list)
				modules.helper.divBuilder('selectedDisplay', modules.ui.root, 'ui-select-display');
				console.log(modules.ui.selectedDisplay);
				modules.ui.selectedDisplay.append(modules.getFirstElement());

				// select arrow
				modules.helper.divBuilder('arrow', modules.ui.root, 'ui-select-arrow', false, false, '&#9662;');

				// wrap everything in container
				modules.helper.divBuilder('dropdown', modules.ui.root, 'ui-select-dropdown');

				// search box
				modules.ui.dropdown.append('<input type="textbox" class="ui-searchbox" value="" />');
				modules.ui.search = modules.ui.root.find('.ui-searchbox');

				// add a result area
				modules.helper.divBuilder('result', modules.ui.dropdown, 'ui-select-results');

				// populate result dropdown
				if(!modules.checkRemote()){
					// for local source, show all the options
					modules.renderResult(modules.data.local);
				}else{
					// for remote source, show a hint
					modules.ui.result.append('Please enter minimum '+settings.remote.minchar+' characters');
				}
			},

			// initialize listeners
			initListeners: function(){
				// searchbox
				modules.ui.search.keyup(function(){
					modules.data.searchVal = $(this).val();
					if(modules.checkRemote()){
						if(modules.data.searchVal.length >= 3){
							modules.search(modules.data.searchVal);
						}
					}else{
						modules.search(modules.data.searchVal);
					}
				});

				// hide the menu when clicked outisde
				$('html').click(function() {
					modules.ui.dropdown.hide();
					if(!modules.checkRemote()){
						modules.ui.search.val('');
						modules.ui.search.trigger('keyup');
					}
				});
				// stop the propagation inside
				modules.ui.root.click(function(event){
					event.stopPropagation();
				});

				// select element and arrow
				modules.ui.selectedDisplay.click(function(event){
					modules.focusElement();
				});
				modules.ui.arrow.click(function(event){
					modules.focusElement();
				});

				// select option
				$('#'+modules.element.id+'-ui').find('.ui-select-results').on('click', '.selectable', function(){
					// populate the original form element
					$('#'+modules.element.id).val($(this).attr('data-value'));
					modules.ui.selectedDisplay.html($(this).html());
					modules.ui.dropdown.toggle();

				});

				// detect end of result scrolling for remote data (for infinite loading)
				if(modules.checkRemote()){
					modules.ui.result.bind('scroll', function(){
						if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight){
							modules.loadRemote(modules.searchVal);
						}
					});
				}
			},

			// search function
			search: function(searchvalue){
				if(modules.checkRemote()){ // search remote data
					$.getJSON(settings.remote.url+'&'+settings.remote.search+'='+encodeURIComponent(searchvalue)+'&'+settings.remote.pageSize.label+'='+settings.remote.pageSize.value+'&'+settings.remote.page.label+'='+settings.remote.page.value+'&callback=?'
					).done(function(json){
						modules.remote.eof = false;
						modules.remote.page = 1;
						modules.ui.result.empty();
						modules.renderResult(json, settings.remote.value, settings.remote.label);
					}).fail(modules.helper.displayJSONerror);
				}else{ // search local data
					var result = [];

					// iterate through the select options
					$.each(modules.data.local, function(){
						if(this.val instanceof Array){ // this is an optgroup
							var opt_result = [];
							$.each(this.val, function(){
								if(this.lbl.toLowerCase().indexOf(searchvalue.toLowerCase()) >= 0){
									opt_result.push(this);
								}
							});
							if(opt_result.length !== 0){
								result.push({val: opt_result, lbl: this.lbl});
							}
						}else{ // this is an option
							if(this.lbl.toLowerCase().indexOf(searchvalue.toLowerCase()) >= 0){
								result.push(this);
							}
						}
					});
					modules.renderResult(result);
				}
			},

			// render the result
			renderResult: function(result, valueObj, labelObj){
				var value, label;

				// check if rendering for remote or local feed
				if(modules.checkRemote()){
					value = valueObj;
					label = labelObj;
					// remove the loader slice if remote
					modules.ui.result.children().filter('span.loader').remove();
					// array source
					resultArray = result[settings.remote.root];
				}else{
					value = 'val';
					label = 'lbl';
					// reset the list if local
					modules.ui.result.empty();
					// array source
					resultArray = result;
				}

				var displayResult = $('<ul></ul>');
				var optionResult, resultArray;

				// iterate through the result
				$.each(resultArray, function(){
					if(this[value] instanceof Array){ // this is an optgroup
						optionResult = $('<li></li>');
						// render the optgroup label
						optionResult.append('<span>'+this[label]+'</span>');
						var optionGroupResult = $('<ul></ul>');

						$.each(this[value], function(){
							optionGroupResult.append('<li data-value="'+this[value]+'" class="selectable">'+this[label]+'</li>');
						});
						optionResult.append(optionGroupResult);
					}else{ // this is an option
						optionResult = '<li data-value="'+this[value]+'" class="selectable">'+this[label]+'</li>';
					}
					displayResult.append(optionResult);
				});

				// check if there are results to return
				if(displayResult.children().length === 0){
					if(!modules.remote.eof){
						modules.ui.result.append('<ul><li>No results</li></ul>');
					}
				}else{
					modules.ui.result.append(displayResult);
				}

				// if loading from remote source, include a loading bar
				if(modules.checkRemote() && !modules.remote.eof && displayResult.children().length !== 0){
					modules.ui.result.append('<span class="loader">Loading...</span>');
				}

			},

			// get the first value
			getFirstElement: function(){
				if(modules.checkRemote()){ // for remote source
					return settings.remote.hint;
				}else{ // for local source
					if(modules.data.local[0].val instanceof Array){ // optgroup
						return modules.data.local[0].val[0].lbl;
					}else{ // option
						return modules.data.local[0].lbl;
					}
				}
			},

			// focus select element, this is to bring the z-index of the div to the top
			focusElement: function(){
				$('.select-anchor').removeClass('focus');
				modules.ui.anchor.toggleClass('focus');
				modules.ui.dropdown.toggle();
				modules.ui.search.focus();
			},

			// check if using remote data
			checkRemote: function(){
				if(settings.remote.url !== null){
					return true;
				}else{
					return false;
				}
			},

			// load from remote
			loadRemote: function(searchvalue){
				if(modules.checkRemote() && !modules.remote.eof){
					// does a JSONP request
					$.getJSON(settings.remote.url+'&'+settings.remote.search+'='+encodeURIComponent(searchvalue)+'&'+settings.remote.pageSize.label+'='+settings.remote.pageSize.value+'&'+settings.remote.page.label+'='+modules.remote.page+'&callback=?'
					).done(function(json){
						if(json[settings.remote.root].length === 0){ // if no results are returned, we have reached the End of Feed
							modules.remote.eof = true;
							modules.renderResult(json);
						}else{
							modules.renderResult(json, settings.remote.value, settings.remote.label);
						}
					}).fail(modules.helper.displayJSONerror);
				}
				// increment the page number so that the next load will request the next page
				modules.remote.page++;
			},

			// initialise the module
			init: function(element){
				if(modules.checkRemote()){
					modules.remote.page = settings.remote.page.value;
				}else{
					modules.parseElement(element);
				}

				modules.element.id = element.attr('id');
				modules.elementName = element.attr('name');
				modules.constructElement(element);
				modules.initListeners();
			},

			// helper functions
			helper: {
				// display JSON errors
				displayJSONerror: function(jqxhr, textStatus, error){
					console.log("Request Failed: "+textStatus+', '+error);
				},

				// div builder
				divBuilder: function(saveAs, element, classname, id, append, content){
					var string = {
						id: '',
						classname: '',
						content: '',
						element: ''
					};

					if(!_.isUndefined(classname)){
						string.classname = ' class="'+classname+'"';
					}
					if(!_.isUndefined(id)){
						if(id !== false){
							string.id = ' id="'+id+'"';
						}
					}
					if(!_.isUndefined(content)){
						string.content = content;
					}

					string.element = '<div'+string.id+string.classname+'>'+string.content+'</div>';

					if(_.isUndefined(append)){
						element.append(string.element);
					}else{
						if(!append){
							element.append(string.element);
						}else{
							element.replaceWith(string.element);
						}
					}

					if(_.isString(id)){
						modules.ui[saveAs] = $('#'+id);
					}else{
						modules.ui[saveAs] = modules.ui.root.find('.'+classname);
					}
				}
			}
		};

		// initialise the plugin
		modules.init(this);

		return this;
	};
}(jQuery));