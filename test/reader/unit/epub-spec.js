'use strict';

describe('Epub', function() {

	var Epub, $dom, $nodes, $node, $dots, text, marker;

	beforeEach(function(){
		// set up epub
		Reader.Book.load(fixtures.BOOK.DATA);
		Epub = Reader.Epub;
		Epub.setUp(0, Reader.Book);
		marker = '<i class="'+Epub.BLACKLIST[0]+'"></i>';

		// create a demo document for test
		$dom = $((new window.DOMParser()).parseFromString('<html>' +
			'<body>' +
				'<div id="textRange">Text node</div>' +
				'<div id="nodeRange">' +
					'<span>Text node</span>Text node<span>Text node</span>' +
				'</div>' +
				'<div id="dots.dots..dots">Text node</div>' +
			'</body></html>', 'text/xml'));

		$node = $dom.find('#nodeRange');
		$nodes = $dom.find('#nodeRange span');
		$dots = $dom.find('#dots\\.dots\\.\\.dots');
		text = $dom.find('#textRange').contents()[0];

		// stub out these methods used by the epub module as they are out of scope of this test
		spyOn(Epub, 'normalizeChapterPartCFI').and.callFake(function(cfi){
			return cfi;
		});
		spyOn(Epub, 'removeContext').and.callFake(function(cfi){
			return cfi;
		});
		spyOn(Epub, 'addContext').and.callFake(function(cfi){
			return cfi;
		});
		Reader.$iframe = {
			contents: function(){
				return $dom;
			}
		};
		Reader.document = $dom[0];
		// workaround PhantomJS. manipulating dom nodes using a range from a different document throws a WRONG_DOCUMENT_ERR that does not exist in other browsers.
		spyOn(document, 'createRange').and.callFake(function(){
			return $dom[0].createRange();
		});
	});

	afterEach(function(){
		Reader.$iframe = null;
	});

	it('should initialise Epub manager API', function(){
		expect(Epub).toBeObject();
		expect(Epub.generateCFI).toBeFunction();
		expect(Epub.getElementAt).toBeFunction();
		expect(Epub.injectMarker).toBeFunction();
		expect(Epub.generateRangeCFI).toBeFunction();
		expect(Epub.injectRangeMarker).toBeFunction();
	});

	describe('Range CFI', function(){
		it('should generate range cfi for text nodes', function(){
			var range = $dom[0].createRange(),
				startOffset = 0, endOffset = 1;

			range.setStart(text, startOffset);
			range.setEnd(text, endOffset);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2/2[textRange],/1:'+startOffset+',/1:'+endOffset+')');
		});

		it('should generate range cfi for normal nodes', function(){
			var range = $dom[0].createRange();

			range.setStart($nodes[0], 0);
			range.setEnd($nodes[1], 0);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2/4[nodeRange],/2,/4)');
		});

		it('should generate range cfi for a text node and an element node', function(){
			var range = $dom[0].createRange();

			range.setStart(text, 0);
			range.setEnd($nodes.first()[0], 0);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2,/2[textRange]/1:0,/4[nodeRange]/2)');
		});

		it('should generate range cfi for an element node and a text node', function(){
			var range = $dom[0].createRange();

			range.setStart($nodes.first()[0], 0);
			range.setEnd($dots.contents()[0], 0);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2,/4[nodeRange]/2,/6[dots.dots..dots]/1:0)');
		});

		it('should generate range cfi for an element node and a text node with the same parent', function(){
			var range = $dom[0].createRange();

			range.setStart($node.contents()[0], 0);
			range.setEnd($node.contents()[1], 1);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2/4[nodeRange],/2,/1:1)');
		});

		it('should generate range cfi for a text node in an element node and a text node with the same parent', function(){
			var range = $dom[0].createRange();

			range.setStart($nodes.contents()[0], 0);
			range.setEnd($node.contents()[1], 1);

			expect(Epub.generateRangeCFI(range)).toEqual('epubcfi(/6/2!/2/4[nodeRange],/2/1:0,/1:1)');
		});

		it('should inject marker for a range CFI', function(){
			var range = $dom[0].createRange(),
				startOffset = 0, endOffset = 1;

			range.setStart(text, startOffset);
			range.setEnd(text, endOffset);

			Epub.injectRangeMarker(Epub.generateRangeCFI(range), marker);
		});
	});

	describe('CFIs', function(){
		it('should generate CFI for a text node', function(){
			expect(Epub.generateCFI(text, 0)).toEqual('epubcfi(/6/2!/2/2[textRange]/1:0)');
		});

		it('should generate CFI for a full node', function(){
			expect(Epub.generateCFI($nodes[0])).toEqual('epubcfi(/6/2!/2/4[nodeRange]/2)');
			expect(Epub.generateCFI($nodes[1])).toEqual('epubcfi(/6/2!/2/4[nodeRange]/4)');
		});

		it('should generate CFI for a full node with dots within an ID', function(){
			expect(Epub.generateCFI($dots.contents()[0], 0)).toEqual('epubcfi(/6/2!/2/6[dots.dots..dots]/1:0)');
		});

		it('should inject marker given a CFI', function(){
			var $text = $dom.find('#textRange');

			expect($text.contents().length).toEqual(1);
			Epub.injectMarker('epubcfi(/6/2!/2/2[textRange]/1:1)', marker);
			expect($text.contents().length).toEqual(3);
			expect($text.find('.' + Epub.BLACKLIST[0]).length).toEqual(1);
		});

		it('should inject marker in a text node with a parent that contains dots in the ID', function(){
			expect($dots.contents().length).toEqual(1);
			Epub.injectMarker('epubcfi(/6/2!/2/6[dots.dots..dots]/1:1)', marker);
			expect($dots.contents().length).toEqual(3);
			expect($dots.find('.' + Epub.BLACKLIST[0]).length).toEqual(1);
		});

		/*
		 * The text node is split into two text nodes by the marker node.
		 * The CFI generated should blacklist of the marker, and treat the text node as one.
		 * Therefore the offset should be the length of the first text node + the given offset
		 * */
		it('should generate CFI for a text node with a marker', function(){
			Epub.injectMarker('epubcfi(/6/2!/2/2[textRange]/1:1)', marker);

			var text = $dom.find('#textRange').contents()[2];

			expect(Epub.generateCFI(text, 1)).toEqual('epubcfi(/6/2!/2/2[textRange]/1:2)');
		});
	});
});