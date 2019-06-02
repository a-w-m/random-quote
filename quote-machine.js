"use strict";

function main() {



    function initQuoteMachine(callback = getRandomPersonPage) {

        /* This function makes an API request and passes a random Page ID (String) of a page within "Category:People" and an array of unwanted pageIDS to the callback function (getRandomPersonPage)" (https://en.wikiquote.org/wiki/Category:People). The pages within "Category:People" are organized alphabetically by last name and contain a list of links to individual person pages */

        var request = new XMLHttpRequest();
        var peoplePagesQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=categorymembers&gcmtitle=Category:People&gcmnamespace=0&gcmlimit=500&format=json&formatversion=2"


        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {

                //convert JSON response to object
                var responseJSON = (JSON.parse(request.responseText));

                //random number generator from 1 to response.query.pages.length; starts at 1 because the pageID at index 0 is not an appropriate People Page
                var randomIndex = Math.floor(Math.random() * (responseJSON.query.pages.length - 1)) + 1;

                //Create an array of all the page IDs of members of "Category: People." to pass into the callback function as the filtering Array. These page ids are included in the API response to getRandomPersonPage (this function's callback function), and need to be filtered out to prevent making an API request that points back to a member of "Category:People".

                var idsToFilter = responseJSON.query.pages.map(item => {
                    return item.pageid
                })
                idsToFilter.push(94);

                console.log(responseJSON["query"]["pages"][randomIndex]["pageid"].toString());
                var pageID = responseJSON["query"]["pages"][randomIndex]["pageid"].toString();

                callback(pageID, [], idsToFilter)

            } else {
                console.error(request.status);
            }
        }

        request.open('GET', peoplePagesQuery);
        request.send();



    };


    function getRandomPersonPage(pageID, personPages = [], filterArray = [], callback = getQuote) {
        /* this function takes as an argument the page ID (string) of a page within "Category: People", an array that carries results for recursive calls, an array that filters unwanted page IDs returned in the JSON response and a callback function. It  a random page ID (string) of a linked person page */

        var request = new XMLHttpRequest();
        //wikimedia API requires "&continue=" within query url in order to continue the query passed the 500 element limit
        var personPageQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=links&gplnamespace=0&gpllimit=500&prop=info&format=json&formatversion=2&pageids=" + pageID + "&continue="



        console.log(personPageQuery)


        request.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {

                //convert response to object

                var responseJSON = (JSON.parse(request.responseText));

                //concatenate the list of results to personPages parameter
                personPages = personPages.concat(responseJSON.query.pages)

                //conditional logic and recursion to handle query results that require multiple requests using the API query continue parameter
                if ("continue" in responseJSON) {
                    var contPageID = pageID + responseJSON.continue.continue+"&gplcontinue=" + responseJSON.continue.gplcontinue
                    getRandomPersonPage(contPageID, personPages, filterArray, getQuote);
                } else {
                    //Aggregated all responses from the API and now filtering out elements with missing page IDs or page IDs that lead us back up the query chain.
                    personPages = personPages.filter((item) => {
                        if ("pageid" in item && filterArray.includes(item.pageid) === false) {
                            return item
                        }
                    })
                    //random number generator used to grab random element from personPages down below.
                    var randomIndex = Math.floor(Math.random() * (personPages.length))
                    console.log(personPages, randomIndex, personPageID)
                    var personPageID = personPages[randomIndex]["pageid"].toString();

                    callback(personPageID)

                }
            } else {
                console.log(request.onerror)

            }
        }

        request.open("GET", personPageQuery);
        request.send();


    };


    function getQuote(pageID, callback = displayQuote) {

        var request = new XMLHttpRequest();
        var quoteQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=parse&format=json&prop=text%7Csections%7Cdisplaytitle%7Cparsewarnings&section=1&pageid=" + pageID
        var quote = ""


        request.onload = function() {
            var responseJSON = JSON.parse(request.responseText);

            if ("error" in responseJSON) {
                return initQuoteMachine();
            } else if ("sections" in responseJSON.parse != true) {
                return initQuoteMachine();
            } else if (responseJSON.parse.sections[0].anchor.toLowerCase() != "quotes") {
                return initQuoteMachine();
            }

            var quotes = cleanQuotes(responseJSON)

            if (quotes.length == 0) {
                return initQuoteMachine();
            }

            var randomIndex = Math.floor(Math.random() * quotes.length)

            callback(quotes[randomIndex], responseJSON.parse.title)



        }

        request.open("GET", quoteQuery);
        request.send();

    };

    function cleanQuotes(jsonObject) {
        var grabDirtyQuotes = new RegExp(/<ul>(.*?)<ul>/gm);
        var cleanUpQuotes = new RegExp(/<.*?>|\\n|\\/gm);
        var cleanQuotes = []
        var verifier = new RegExp(/[\[\]\^\+\{\}\=]|\(\d\)\d.\d|1.Quotes|\[edit\]/gm)

        var dirtyQuotesList = (JSON.stringify(jsonObject.parse.text['*']).match(grabDirtyQuotes))

        console.log(jsonObject)

        console.log(dirtyQuotesList)

        cleanQuotes = dirtyQuotesList.reduce(function(results, item) {

            if (verifier.test(item.replace(cleanUpQuotes, "")) == false) {
                results.push(item.replace(cleanUpQuotes, ""))
                return results
            } else {
                return results
            }
        }, []);

        console.log(cleanQuotes)
        return cleanQuotes


    };



    function displayQuote(quote, author, ) {

        document.getElementById("text").innerHTML = quote;
        document.getElementById("author").innerHTML = author;



        document.getElementById('new-quote').onclick = function() {

            if (displayQuote.previous == undefined) {
                displayQuote.previous = []
            }

            displayQuote.previous.push({
                "quote": quote,
                "author": author
            })
            displayQuote.lastIndex = displayQuote.previous.length - 1
            initQuoteMachine();
        }

        document.getElementById("prev-quote").onclick = function() {
            console.log(displayQuote.previous, displayQuote.lastIndex)
            document.getElementById("text").innerHTML = displayQuote.previous[displayQuote.lastIndex].quote
            document.getElementById("author").innerHTML = displayQuote.previous[displayQuote.lastIndex]["author"]
            displayQuote.lastIndex--;
        }

    }


    initQuoteMachine();
}




main();


//fix hawthorne numbers
//fix poetry (de kok) line breaks (jacques prevert) {replace <br> with /}
//quote of the day showing up
//stub pages Qin Shi Huang
//page numbers stephen covey