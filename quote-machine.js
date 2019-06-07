"use strict";

function main() {



    function initQuoteMachine(callback = getRandomPersonPage) {

        /* This function makes an API request and passes a random Page ID (String) of a page within "Category:People" and an array of unwanted pageIDS to the callback function (getRandomPersonPage)" (https://en.wikiquote.org/wiki/Category:People). The pages within "Category:People" are organized alphabetically by last name and contain a list of links to individual person pages */

        let request = new XMLHttpRequest();
        let peoplePagesQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=categorymembers&gcmtitle=Category:People&gcmnamespace=0&gcmlimit=500&format=json&formatversion=2"


        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {

                //convert JSON response to object
                let responseJSON = (JSON.parse(request.responseText));
                

                //random number generator from 1 to response.query.pages.length; starts at 1 because the pageID at index 0 is not an appropriate People Page
                let randomIndex = Math.floor(Math.random() * (responseJSON.query.pages.length - 1)) + 1;

                //Create an array of all the page IDs of members of "Category: People." to pass into the callback function as the filtering Array. These page ids are included in the API response to getRandomPersonPage (this function's callback function), and need to be filtered out to prevent making an API request that points back to a member of "Category:People".

                let idsToFilter = responseJSON.query.pages.map(item => {
                    return item.pageid
                })
                idsToFilter.push(94);

                console.log(responseJSON["query"]["pages"][randomIndex]["pageid"].toString());
                let pageID = responseJSON["query"]["pages"][randomIndex]["pageid"].toString();

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

        let request = new XMLHttpRequest();
        //wikimedia API requires "&continue=" within query url in order to continue the query passed the 500 element limit
        let personPageQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=links&gplnamespace=0&gpllimit=500&prop=info&format=json&formatversion=2&pageids=" + pageID + "&continue="


        request.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {

                //convert response to object

                let responseJSON = (JSON.parse(request.responseText));

                //concatenate the list of results to personPages parameter
                personPages = personPages.concat(responseJSON.query.pages)

                //conditional logic and recursion to handle query results that require multiple requests using the API query continue parameter
                if ("continue" in responseJSON) {
                    let contPageID = pageID + responseJSON.continue.continue+"&gplcontinue=" + responseJSON.continue.gplcontinue
                    getRandomPersonPage(contPageID, personPages, filterArray, getQuote);
                } else {
                    //Aggregated all responses from the API and now filtering out elements with missing page IDs or page IDs that lead us back up the query chain.
                    personPages = personPages.filter((item) => {
                        if ("pageid" in item && filterArray.includes(item.pageid) === false) {
                            return item
                        }
                    })
                    //random number generator used to grab random element from personPages down below.
                    let randomIndex = Math.floor(Math.random() * (personPages.length))
                    let personPageID = personPages[randomIndex]["pageid"].toString();
                       
                    console.log(responseJSON, personPages)
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

        let request = new XMLHttpRequest();
        let quoteQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=parse&format=json&prop=text%7Csections%7Cdisplaytitle%7Cparsewarnings&section=1&pageid=" + pageID


        request.onload = function() {
            let responseJSON = JSON.parse(request.responseText);

            if ("error" in responseJSON) {
                return initQuoteMachine();
            } else if ("sections" in responseJSON.parse != true) {
                return initQuoteMachine();
            } else if (responseJSON.parse.sections[0].anchor.toLowerCase() != "quotes") {
                return initQuoteMachine();
            }

            let quotes = cleanQuotes(responseJSON)

            if (quotes.length == 0) {
                return initQuoteMachine();
            }

            let randomIndex = Math.floor(Math.random() * quotes.length)

            callback(quotes[randomIndex], responseJSON.parse.title)



        }

        request.open("GET", quoteQuery);
        request.send();

    };

    function cleanQuotes(jsonObject) {
        let grabDirtyQuotes = new RegExp(/<ul>(.*?)<ul>/gm);
        let grabLineBreaks = new RegExp(/<br\s?\/>/gm)
        let cleanUpQuotes = new RegExp(/<(?!\/?br(?=>|\s.*>))\/?.*?>|\\n|\\/gm);
        let cleanQuotes = []
        let verifierString = "[\\[\\]\\^\\+\\{\\}\\=]|\\d{4}|^\\d+?\\d+$|1.Quotes|\\[edit\\]|Reffering to|p+[g]?\\.\\s?(?=\\d+|[xivcml]+)|ch\\.\\s?(?=\\d+|[xivcml]+)|chapter\\.?\\s(?=\\d+|[xivcml]+)|Book\\.?\\s?(?=\\d+|[xivcml]+)|line+s?\\.?\\s?(?=\\d+|[xivcml]+)|Vol(ume)?\\.|paragraph\\s?(?=\\d+|[xivcml]+)|edition|source needed|stanza|canto|Act,?\\s?scene|quoted" + jsonObject.parse.title
        let verifier = new RegExp(verifierString, "mi")
        console.log((JSON.stringify(jsonObject.parse.text['*']).match(grabDirtyQuotes)))

        try {

            cleanQuotes = (JSON.stringify(jsonObject.parse.text['*']).match(grabDirtyQuotes)).reduce(function(results, item) {
                if (verifier.test(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "")) != true && item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "").length >= 15) {
                    results.push(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, ""))
                }
                return results

            }, [])
        } catch (err) {
            initQuoteMachine();
        }

        console.log(cleanQuotes)
        return cleanQuotes



    };



    function displayQuote(quote, author) {

        document.getElementById("text").innerHTML = quote;
        document.getElementById("author").innerHTML = "—" + author;



        document.getElementById('new-quote').onclick = function() {

            if (displayQuote.previous == undefined) {
                displayQuote.previous = [{
                    "quote": quote,
                    "author": author

                }];

            } else {
                displayQuote.previous.push({
                    "quote": quote,
                    "author": author

                })


            }

            displayQuote.lastIndex = displayQuote.previous.length - 1
            initQuoteMachine()

        }

        document.getElementById("prev-quote").onclick = function() {
            document.getElementById("text").innerHTML = displayQuote.previous[displayQuote.lastIndex]["quote"]
            document.getElementById("author").innerHTML = "—" + displayQuote.previous[displayQuote.lastIndex]["author"]
            displayQuote.lastIndex--;

        }

        document.getElementById("tweet-link").setAttribute('href', "http://twitter.com/intent/tweet?text=" + document.getElementById("text").innerHTML)

        document.getElementById("tumblr-link").setAttribute('href', "https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=quotes&caption=" + encodeURI(document.getElementById("author").innerHTML) + "&content=" + encodeURI(document.getElementById("text").innerHTML) + "&canonicalUrl=https%3A%2F%2Fwww.tumblr.com%2Fbuttons&shareSource=tumblr_share_button&posttype=quote")



    }

    initQuoteMachine();
}


main();


