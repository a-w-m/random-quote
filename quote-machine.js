"use strict";

async function main() {



    function status(response) {
        /*This function returns a resolved promise if the fetch request has no error, and a rejected promise it has an error */
        if (response.status >= 200 && response.status < 300) {
            return Promise.resolve(response)
        } else {
            return Promise.reject()
        }
    }

    function json(response) {
        /*This function transforms the fetch response into JSON*/
        return response.json();
    }

    async function initQuoteMachine() {


        /* This function makes a fetch request to the wikquote "Category:People" page (https://en.wikiquote.org/wiki/Category:People) and returns a promise of an object containing a random pageID to a page within "Category:People" and an array of page ids to filter out in the next fetch request. The pages within "Category:People" are organized alphabetically by last name and contain a list of links to individual person pages */



        let peoplePagesQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=categorymembers&gcmtitle=Category:People&gcmnamespace=0&gcmlimit=500&format=json&formatversion=2"

        let response = await fetch(peoplePagesQuery).then(status).then(json).then(function(responseJSON) {

            let idsToFilter = responseJSON.query.pages.map(item => {
                return item.pageid
            })
            idsToFilter.push(94);


            return {
                pageid: responseJSON["query"]["pages"][Math.floor(Math.random() * (responseJSON.query.pages.length - 1)) + 1]["pageid"].toString(),
                idsToFilter: idsToFilter
            }
        })

        return response;



    }


    async function getRandomPersonPage(data) {

        /* this function takes as an argument an object containing a random pageID to a page within "Category:People" and an array of pageids to be filtered out of the fetch response as they link back to "Category:People"

        wikimedia API requires "&continue=" within query url in order to continue the query passed the 500 element limit. The function handles these multiple requests using recursion. Returns a promise of a single string pageid of a random person page*/


        let personPageQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=links&gplnamespace=0&gpllimit=500&prop=info&format=json&formatversion=2&pageids="
        let personPages = []

        let response = await fetch(personPageQuery + data.pageid + "&continue=").then(status).then(json).then(function(responseJSON) {

            personPages = personPages.concat(responseJSON.query.pages)

            if ("continue" in responseJSON) {
                let initCont = data.pageid + responseJSON.continue.continue+"&gplcontinue=" + responseJSON.continue.gplcontinue

                //function used for recursive fetch requests
                let fetchCont = function(url, query) {

                    return fetch(url + query).then(status).then(json).then(function(res) {

                        if ("continue" in res) {
                            personPages = personPages.concat(res.query.pages)
                            let contQuery = data.pageid + res.continue.continue+"&gplcontinue=" + res.continue.gplcontinue
                            return fetchCont(personPageQuery, contQuery);

                        } else {
                            personPages = personPages.concat(res.query.pages)
                            return personPages

                        }
                    })

                }

                return fetchCont(personPageQuery, initCont);

            } else {
                return personPages
            }



        }).then(personPages => {

            //filter out pageids that don't lead to a person page
            personPages = personPages.filter((item) => {
                if ("pageid" in item && data.idsToFilter.includes(item.pageid) === false) {
                    return item
                }
            })

            return personPages[Math.floor(Math.random() * (personPages.length))]["pageid"].toString()
        })

        return response

    };

    async function getQuotePage(pageID) {

        /*This* function makes a fetch request to a person page using the pageid passed in as an argument. Checks the JSON response for errors and returns a promise of a valid JSON response.*/

        let quoteQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=parse&format=json&prop=text%7Csections%7Cdisplaytitle%7Cparsewarnings&section=1&pageid=" + pageID


        let response = await fetch(quoteQuery).then(status).then(json).then(function(responseJSON) {

            if ("error" in responseJSON) {
                getQuotePage(pageID);
            } else if ("sections" in responseJSON.parse != true) {
                getQuotePage(pageID);
            } else if (responseJSON.parse.sections[0].anchor.toLowerCase() != "quotes") {
                getQuotePage(pageID);
            } else {
                return Promise.resolve(responseJSON)
            }
        })

        return response


    };

    async function getQuote(jsonObject) {
        /*This function takes a JSON object as an argument, grabs the quotes from the page, and used regex to parse out valid quotes. Returns a promise of an object containing a single random quote from the page and the author's name */

        try {

            let title = await jsonObject.parse.title
            let grabDirtyQuotes = new RegExp(/<ul>(.*?)<ul>/gm);
            let grabLineBreaks = new RegExp(/<br\s?\/>/gm)
            let cleanUpQuotes = new RegExp(/<(?!\/?br(?=>|\s.*>))\/?.*?>|\\n|\\/gm);
            let verifierString = "[\\[\\]\\^\\+\\{\\}\\=]|\\d{4}|^\\d+?\\d+$|1.Quotes|\\[edit\\]|Reffering to|p+[g]?\\.\\s?(?=\\d+|[xivcml]+)|page[s]?\\s?\\d+|ch\\.\\s?(?=\\d+|[xivcml]+)|chapter\\.?\\s(?=\\d+|[xivcml]+)|Book\\.?\\s?(?=\\d+|[xivcml]+)|line+s?\\.?\\s?(?=\\d+|[xivcml]+)|Vol(ume)?\\.|paragraph\\s?(?=\\d+|[xivcml]+)|edition|source needed|stanza|canto|Act,?\\s?scene|quoted" + title
            let verifier = new RegExp(verifierString, "mi")



            //apply regex to clean up and validate quotes 
            let quotes = await (JSON.stringify(jsonObject.parse.text['*']).match(grabDirtyQuotes)).reduce(function(results, item) {
                if (verifier.test(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "")) != true && item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "").length >= 15) {
                    results.push(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, ""))
                }
                return results

            }, [])


            if (quotes.length == 0) {
                return main();
            }

            return Promise.resolve({
                quote: quotes[Math.floor(Math.random() * quotes.length)],
                author: jsonObject.parse.title
            })
        } catch (err) {
            return main();
        }
    };



    async function displayQuote(data) {
        /*this function renders the quote and author on the page. It takes in as an argument an object containing two key/value pairs: a single random quote and the author */

        try {
            let quote = await data.quote
            let author = await data.author
            document.getElementById("text").innerHTML = quote;
            document.getElementById("author").innerHTML = "—" + author;

        } catch (err) {
            console.log("displayerr");
        }

    }

    function updateSocialMediaLinks() {

        /*This function updates the post to twitter and tumblr links when the quote changes*/

        document.getElementById("tweet-link").setAttribute('href', "http://twitter.com/intent/tweet?text=" + document.getElementById("text").innerHTML)

        document.getElementById("tumblr-link").setAttribute('href', "https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=quotes&caption=" + encodeURI(document.getElementById("author").innerHTML) + "&content=" + encodeURI(document.getElementById("text").innerHTML) + "&canonicalUrl=https%3A%2F%2Fwww.tumblr.com%2Fbuttons&shareSource=tumblr_share_button&posttype=quote")

      
    }

    let response = await initQuoteMachine();
    let Person = await getRandomPersonPage(response)
    let quotePage = await getQuotePage(Person)
    let quote = await getQuote(quotePage)
    let display = await displayQuote(quote)
    let social = await updateSocialMediaLinks();

    if (main.previous == undefined) {
        main.previous = [];
    }
    if (quote) {
        main.previous.push(quote)
        main.lastIndex = main.previous.length - 2;
    }

    

    document.getElementById('new-quote').onclick = main

    document.getElementById("prev-quote").onclick = function() {
        document.getElementById("text").innerHTML = main.previous[main.lastIndex]["quote"]
        document.getElementById("author").innerHTML = "—" + main.previous[main.lastIndex]["author"]
        main.lastIndex--;

        updateSocialMediaLinks();

    }


};

main();