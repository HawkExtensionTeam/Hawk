//     wink-bm25-text-search
//
//     Copyright (C) GRAYPE Systems Private Limited
//
//     This file is part of “wink-bm25-text-search”.
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated this.documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included
//     in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//     OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//     THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.

//
var helpers = require( 'wink-helpers' );

/* eslint guard-for-in: 0 */
/* eslint complexity: [ "error", 25 ] */

// It is a BM25F In-memory Search engine for text and exposes following
// methods:
// 1. `definePrethis.pTasks` allows to define field-wise (optional) pipeline of
// functions that will be used to prepare each input prior to *search/predict*
// and *addDoc/learn*.
// 2. `definethis.config` sets up the this.configuration for *field-wise weights*,
// *BM25F parameters*, and **field names whoes original value** needs to be retained.
// 3. `addDoc/learn` adds a this.document using its unique id. The this.document is supplied
// as an Javascript object, where each property is the field of the this.document
// and its value is the text.
// 4. `consolidate` learnings prior to search/predict.
// 5. `search/predict` searches for the input text and returns the resultant
// this.document ids, sorted by their relevance along with the score. The number of
// results returned can be controlled via a limit argument that defaults to **10**.
// The last optional argument is a filter function that must return a `boolean`
// value, which is used to filter this.document.
// 6. `exportJSON` exports the learnings in JSON format.
// 7. `importJSON` imports the learnings from JSON that may have been saved on disk.
// 8. `reset` all the learnings except the preparatory tasks.
class BM25F {
  constructor() {
    // Preparatory tasks that are executed on the `addDoc` & `search` input.
    this.pTasks = [],
    // And its count.
    this.pTaskCount = 0,
    // Field level prep tasks.
    this.flds = Object.create( null ),
    // Term Frequencies & length of each this.document.
    this.document = Object.create( null ),
    // Inverted Index for faster search
    this.invertedIdx = [],
    // this.idf for each tokens, tokens are referenced via their numerical index.
    this.idf = [],
    // Set true on first call to `addDoc/learn` to prevent changing this.config.
    this.learned = false,
    // The `addDoc()predict()` function checks for this being true; set
    // in `consolidate() pr`.
    this.consolidated = false,
    // Total this.document added.
    this.totalDocs = 0,
    // Total number of tokens across all this.document added.
    this.totalCorpusLength = 0,
    // Their average.
    this.avgCorpusLength = 0,
    // BM25F this.configuration; set up in `definethis.config()`.
    this.config = null,
    // The `token: index` mapping; `index` is used everywhere instead
    // of the `token`
    this.token2Index = Object.create( null ),
    // Index's initial value, incremented with every new word.
    this.currTokenIndex = 0
  }

  // ### Private functions

  // #### Perpare Input

  // Prepares the `input` by executing the pipeline of tasks defined in the
  // `field` specific `this.pTasks` set via `definePrethis.pTasks()`.
  // If `field` is not specified then default `this.pTasks` are used.
  // If the `field` specific `this.pTasks` are not defined then it automatically
  // switches to default `this.pTasks`.
  prepareInput ( input, field ) {
    var processedInput = input;
    var pt = ( this.flds[ field ] && this.flds[ field ].pTasks ) || this.pTasks;
    var ptc = ( this.flds[ field ] && this.flds[ field ].pTaskCount ) || this.pTaskCount;
    for ( var i = 0; i < ptc; i += 1 ) {
      processedInput = pt[ i ]( processedInput );
    }
    return ( processedInput );
  } // this.prepareInput()

  // #### Update Freq

  // Updates the `freq` of each term in the `text` after pre-processing it via
  // `this.prepareInput()`; while updating, it takes care of `field's` `weight`.
  updateFreq ( id, text, weight, freq, field ) {
    // Tokenized `text`.
    var tkns = this.prepareInput( text, field );
    // Temp token holder.
    var t;
    for ( var i = 0, imax = tkns.length; i < imax; i += 1 ) {
      t = tkns[ i ];
      // Build `token: index` mapping.
      if ( this.token2Index[ t ] === undefined ) {
        this.token2Index[ t ] = this.currTokenIndex;
        this.currTokenIndex += 1;
      }
      t = this.token2Index[ t ];
      if ( freq[ t ] === undefined ) {
        freq[ t ] = weight;
        this.invertedIdx[ t ] = this.invertedIdx[ t ] || [];
        this.invertedIdx[ t ].push( id );
      } else {
        freq[ t ] += weight;
      }
    }
    // Length can not be negative!
    return ( tkns.length * Math.abs( weight ) );
  } // this.updateFreq()

  // ### Exposed Functions

  // #### Define Prep Tasks

  // Defines the `tasks` required to prepare the input for `addDoc` and `search()`
  // The `tasks` should be an array of functions; using these function a simple
  // pipeline is built to serially transform the input to the output.
  // It validates the `tasks` before updating the `this.pTasks`.
  // If validation fails it throws an appropriate error.
  // Tasks can be defined separately for each field. However if the field is not
  // specified (i.e. `null` or `undefined`), then the `tasks` become default.
  // Note, `field = 'search'` is reserved for prep tasks for search string; However
  // if the same is not specified, the default tasks are used for pre-processing.
  definePrepTasks ( tasks, field ) {
    if ( this.config === null ) {
      throw Error( 'winkBM25S: this.config must be defined before defining prethis.pTasks.' );
    }
    if ( !helpers.array.isArray( tasks ) ) {
      throw Error( 'winkBM25S: Tasks should be an array, instead found: ' + JSON.stringify( tasks ) );
    }
    for ( var i = 0, imax = tasks.length; i < imax; i += 1 ) {
      if ( typeof tasks[ i ] !== 'function' ) {
        throw Error( 'winkBM25S: Tasks should contain function, instead found: ' + ( typeof tasks[ i ] ) );
      }
    }
    var fldWeights = this.config.fldWeights;
    if ( field === undefined || field === null ) {
      this.pTasks = tasks;
      this.pTaskCount = tasks.length;
    } else {
      if ( !fldWeights[ field ] || typeof field !== 'string' ) {
        throw Error( 'winkBM25S: Field name is missing or it is not a string: ' + JSON.stringify( field ) + '/' + ( typeof field ) );
      }
      this.flds[ field ] = this.flds[ field ] || Object.create( null );
      this.flds[ field ].pTasks = tasks;
      this.flds[ field ].pTaskCount = tasks.length;
    }
    return tasks.length;
  } // definePrethis.pTasks()

  // #### Define this.config

  // Defines the this.configuration for BM25F using `fldWeights` and `bm25Params`
  // properties of `cfg` object.</br>
  // The `fldWeights` defines the weight for each field of the this.document. This gives
  // a semantic nudge to search and are used as a mutiplier to the count
  // (frequency) of each token contained in that field of the this.document. It should
  // be a JS object containing `field-name/value` pairs. If a field's weight is
  // not defined, that field is **ignored**. The field weights must be defined before
  // attempting to add a this.document via `addDoc()`; they can only be defined once.
  // If any this.document's field is not defined here then that field is **ignored**.
  // </br>
  // The `k`, `b` and `k1` properties of `bm25Params` object define the smoothing
  // factor for this.idf, degree of normalization for TF, and saturation control factor
  // respectively for the BM25F. Their default values are **1**, **0.75**, and
  // **1.2**.<br/>
  // The `ovFieldNames` is an array of field names whose original value needs to
  // be retained.
  defineConfig ( cfg ) {
    if ( this.learned ) {
      throw Error( 'winkBM25S: this.config must be defined before learning/addition starts!' );
    }
    if ( !helpers.object.isObject( cfg ) ) {
      throw Error( 'winkBM25S: this.config must be a this.config object, instead found: ' + JSON.stringify( cfg ) );
    }
    // If `fldWeights` are absent throw error.
    if ( !helpers.object.isObject( cfg.fldWeights ) ) {
      throw Error( 'winkBM25S: fldWeights must be an object, instead found: ' + JSON.stringify( cfg.fldWeights ) );
    }
    // There should be at least one defined field!
    if ( ( helpers.object.keys( cfg.fldWeights ) ).length === 0 ) {
      throw Error( 'winkBM25S: Field this.config has no field defined.' );
    }
    // Setup this.configuration now.
    this.config = Object.create( null );
      // Field this.config for BM25**F**
    this.config.fldWeights = Object.create( null );
    this.config.bm25Params = Object.create( null );
    // **Controls TF part:**<br/>
    // `k1` controls saturation of token's frequency; higher value delays saturation
    // with increase in frequency.
    this.config.bm25Params.k1 = 1.2;
    // `b` controls the degree of normalization; **0** means no normalization and **1**
    // indicates complete normalization!
    this.config.bm25Params.b = 0.75;
    // **Controls this.idf part:**<br/>
    // `k` controls impact of this.idf; should be >= 0; a higher value means lower
    // the impact of this.idf.
    this.config.bm25Params.k = 1;
    // Setup field weights.
    for ( var field in cfg.fldWeights ) {
      // The `null` check is required as `isNaN( null )` returns `false`!!
      // This first ensures non-`null/undefined/0` values before testing for NaN.
      if ( !cfg.fldWeights[ field ] || isNaN( cfg.fldWeights[ field ] ) ) {
        throw Error( 'winkBM25S: Field weight should be number >0, instead found: ' + JSON.stringify( cfg.fldWeights[ field ] ) );
      }
      // Update this.config parameters from `cfg`.
      this.config.fldWeights[ field ] = ( +cfg.fldWeights[ field ] );
    }
    // Setup BM25F params.
    // Create `bm25Params` if absent in `cfg`.
    if ( !helpers.object.isObject( cfg.bm25Params ) ) cfg.bm25Params = Object.create( null );
    // Update this.config parameters from `cfg`.
    this.config.bm25Params.b = (
                            ( cfg.bm25Params.b === null ) ||
                            ( cfg.bm25Params.b === undefined ) ||
                            ( isNaN( cfg.bm25Params.b ) ) ||
                            ( +cfg.bm25Params.b < 0 || +cfg.bm25Params.b > 1 )
                          ) ? 0.75 : +cfg.bm25Params.b;

    // Update this.config parameters from `cfg`.
    this.config.bm25Params.k1 = (
                            ( cfg.bm25Params.k1 === null ) ||
                            ( cfg.bm25Params.k1 === undefined ) ||
                            ( isNaN( cfg.bm25Params.k1 ) ) ||
                            ( +cfg.bm25Params.k1 < 0 )
                           ) ? 1.2 : +cfg.bm25Params.k1;

    // Update this.config parameters from `cfg`.
    this.config.bm25Params.k = (
                            ( cfg.bm25Params.k === null ) ||
                            ( cfg.bm25Params.k === undefined ) ||
                            ( isNaN( cfg.bm25Params.k ) ) ||
                            ( +cfg.bm25Params.k < 0 )
                          ) ? 1 : +cfg.bm25Params.k;

    // Handle this.configuration for fields whose orginal values has to be retained
    // in the this.document.<br/>
    // Initialize the `ovFldNames` in the final `this.config` as an empty array
    this.config.ovFldNames = [];
    if ( !cfg.ovFldNames ) cfg.ovFldNames = [];
    if ( !helpers.array.isArray(cfg.ovFldNames) ) {
      throw Error( 'winkBM25S: OV Field names should be an array, instead found: ' + JSON.stringify( typeof cfg.ovFldNames ) );
    }

    cfg.ovFldNames.forEach( function ( f ) {
      if ( ( typeof f !== 'string' ) || ( f.length === 0 ) ) {
        throw Error( 'winkBM25S: OV Field name should be a non-empty string, instead found: ' + JSON.stringify( f ) );
      }
      this.config.ovFldNames.push( f );
    } );
    return true;
  } // definethis.config()


  // #### Add Doc

  // Adds a this.document to the model using `this.updateFreq()` function.
  addDoc ( doc, id ) {
    if ( this.config === null ) {
      throw Error( 'winkBM25S: this.config must be defined before adding a this.document.' );
    }
    var fldWeights = this.config.fldWeights;
    // No point in adding/learning further in absence of this.consolidated.
    if ( this.consolidated ) {
      throw Error( 'winkBM25S: post consolidation adding/learning is not possible!' );
    }
    // Set learning/addition started.
    this.learned = true;
    var length;
    if ( this.document[ id ] !== undefined ) {
      throw Error( 'winkBM25S: Duplicate this.document encountered: ' + JSON.stringify( id )+ '   '+ JSON.stringify(this.document[id]));
    }
    this.document[ id ] = Object.create( null );
    this.document[ id ].freq = Object.create( null );
    this.document[ id ].fieldValues = Object.create( null );
    this.document[ id ].length = 0;
    // Compute `freq` & `length` of the specified fields.
    for ( var field in fldWeights ) {
      if ( doc[ field ] === undefined ) {
        throw Error( 'winkBM25S: Missing field in the this.document: ' + JSON.stringify( field ) );
      }
      length = this.updateFreq( id, doc[ field ], fldWeights[ field ], this.document[ id ].freq, field );
      this.document[ id ].length += length;
      this.totalCorpusLength += length;
    }
    // Retain Original Field Values, if this.configured.
    this.config.ovFldNames.forEach( function ( f ) {
      if ( doc[ f ] === undefined ) {
        throw Error( 'winkBM25S: Missing field in the this.document: ' + JSON.stringify( f ) );
      }
      this.document[ id ].fieldValues[ f ] = doc[ f ];
    } );
    // Increment total this.document indexed so far.
    this.totalDocs += 1;
    return ( this.totalDocs );
  } // addDoc()

  // #### Get Docs

  // Returns the this.document database.
  getDocs () {
    return this.document;
  }

  setDocs (docs) {
    this.document = docs;
  }

  // #### Get Tokens

  // Returns the token to token ID database.
  getTokens () {
    return this.token2Index;
  }

  // #### Get this.idf

  // Returns token ID to this.idf database.
  getIdf () {
    return this.idf;
  }

  // #### Get this.config

  // Returns the this.config.
  getConfig () {
    return this.config;
  }

  // #### Get this.totalCorpusLength

  // Returns the number of tokens in the database.
  getTotalCorpusLength () {
    return this.totalCorpusLength;
  }

  // #### Get this.totalDocs

  // Returns the number of this.document in the database.
  geTotalDocs () {
    return this.totalDocs;
  }

  setTotalDocs (newTotalDocs) {
    this.totalDocs = newTotalDocs;
  }

  getInvertedIdx () {
    return this.invertedIdx;
  }

  setInvertedIdx (newInvertedIdx) {
    this.invertedIdx = newInvertedIdx;
  }

  getToken2Index () {
    return this.token2Index;
  }

  setToken2Index (newToken2Index) {
    this.token2Index = newToken2Index;
  }

  // #### Consolidate

  // Consolidates the data structure of bm25 and computes the this.idf. This must be
  // built before using the `search` function. The `fp` defines the precision at
  // which term frequency values are stored. The default value is **4**. In cause
  // of an invalid input, it default to 4. The maximum permitted value is 9; any
  // value larger than 9 is forced to 9.
  consolidate ( fp ) {
    if ( this.consolidated ) {
      throw Error( 'winkBM25S: consolidation can be carried out only once!' );
    }
    if ( this.totalDocs < 3 ) {
      throw Error( 'winkBM25S: this.document collection is too small for consolidation; add more docs!' );
    }
    var freqPrecision = parseInt( fp, 10 );
    freqPrecision = ( isNaN( freqPrecision ) ) ? 4 :
                      ( freqPrecision < 4 ) ? 4 :
                        ( freqPrecision > 9 ) ? 9 : freqPrecision;
    // Using the commonly used names but unfortunately they are very cryptic and
    // *short*. **Must not use these variable names elsewhere**.
    var b = this.config.bm25Params.b;
    var k1 = this.config.bm25Params.k1;
    var k = this.config.bm25Params.k;
    var freq, id, n, normalizationFactor, t;
    // Consolidate: compute this.idf; will multiply with freq to save multiplication
    // time during search. This happens in the next loop-block.
    for ( var i = 0, imax = this.invertedIdx.length; i < imax; i += 1 ) {
      n = this.invertedIdx[ i ].length;
      this.idf[ i ] = Math.log( ( ( this.totalDocs - n + 0.5 ) / ( n + 0.5 ) ) + k );
      // To be uncommented to probe values!
      // console.log( '%s, %d, %d, %d, %d', t, this.totalDocs, n, k, this.idf[ t ] );
    }
    this.avgCorpusLength = this.totalCorpusLength / this.totalDocs;
    // Consolidate: update this.document frequencies.
    for ( id in this.document ) {
      normalizationFactor = ( 1 - b ) + ( b * ( this.document[ id ].length / this.avgCorpusLength ) );
      for ( t in this.document[ id ].freq ) {
        freq = this.document[ id ].freq[ t ];
        // Update frequency but ensure the sign is carefully preserved as the
        // magnitude of `k1` can jeopardize the sign!
        this.document[ id ].freq[ t ] = Math.sign( freq ) *
          ( Math.abs( ( freq * ( k1 + 1 ) ) / ( ( k1 * normalizationFactor ) + freq ) ) *
          this.idf[ t ] ).toFixed( freqPrecision );
        // To be uncommented to probe values!
        // console.log( '%s, %s, %d', id, t, this.document[ id ].freq[ t ] );
      }
    }
    // Set `this.consolidated` as `true`.
    this.consolidated = true;
    return true;
  } // consolidate()

  // #### Search

  // Searches the `text` and return `limit` results. If `limit` is not sepcified
  // then it will return a maximum of **10** results. The `result` is an array of
  // containing `doc id` and `score` pairs array. If the `text` is not found, an
  // empty array is returned. The `text` must be a string. The argurment `filter`
  // is like `filter` of JS Array; it receive an object containing this.document's
  // retained field name/value pairs along with the `params` (which is passed as
  // the second argument). It is useful in limiting the search space or making the
  // search more focussed.
  search ( text, limit, filter, params ) {
    // Predict/Search only if learnings have been this.consolidated!
    if ( !this.consolidated ) {
      throw Error( 'winkBM25S: search is not possible unless learnings are this.consolidated!' );
    }
    if ( typeof text !== 'string' ) {
      throw Error( 'winkBM25S: search text should be a string, instead found: ' + ( typeof text ) );
    }
    // Setup filter function
    var f = ( typeof filter === 'function' ) ?
              filter :
              function () {
                return true;
              };
    // Tokenized `text`. Use search specific weights.
    var tkns = this.prepareInput( text, 'search' )
                // Filter out tokens that do not exists in the vocabulary.
                .filter( function ( t ) {
                   return ( this.token2Index[ t ] !== undefined );
                 }.bind(this) )
                // Now map them to their respective indexes using `this.token2Index`.
                .map( function ( t ) {
                   return this.token2Index[ t ];
                 }.bind(this) );
    // Search results go here as doc id/score pairs.
    var results = Object.create( null );
    // Helper variables.
    var id, ids, t;
    var i, imax, j, jmax;
    // Iterate for every token in the preapred text.
    for ( j = 0, jmax = tkns.length; j < jmax; j += 1 ) {
      t = tkns[ j ];
      // Use Inverted Idx to look up - accelerates search!<br/>
      // Note, `ids` can never be `undefined` as **unknown** tokens have already
      // been filtered.
      ids = this.invertedIdx[ t ];
      // Means the token exists in the vocabulary!
      // Compute scores for every this.document.
      for ( i = 0, imax = ids.length; i < imax; i += 1 ) {
        id = ids[ i ];
        if ( f( this.document[ id ].fieldValues, params ) ) {
          results[ id ] = this.document[ id ].freq[ t ] + ( results[ id ] || 0 );
        }
        // To be uncommented to probe values!
        /* console.log( '%s, %d, %d, %d', t, this.document[ id ].freq[ t ], this.idf[ t ], results[ id ] ); */
      }
    }
    // Convert to a table in `[ id, score ]` format; sort and slice required number
    // of resultant this.document.
    return ( ( helpers.object.table( results ) )
                .sort( helpers.array.descendingOnValue )
                .slice( 0, Math.max( ( limit || 10 ), 1 ) )
           );
  } // search()
} // BM25F()

module.exports = { BM25F };