var map;

var removeMode = false;
var addMode = false;
var addMarkerEvent;

var messageStyle = document.getElementById("message");
var table = document.getElementById("MyTable");
var clusterDropdown = document.getElementById("cluster-dropdown");
var dropdown = document.getElementById("dropdown");

var myLatLng = [
    {id: 1, lat: 14.698526902744138, lng: 121.09139364189237, zoom: 17},
    {id: 2, lat: 14.698309331987971, lng: 121.0803800307725, zoom: 17}
];
// i decided na isama na dito yung address data
// para di na maggeocode sa initialize
var patientLocations = [
    {id: 1, lat: 14.696836905199396, lng: 121.08990540524388, address: "1121 Katipunan St, Quezon City, Metro Manila, Philippines"},
    {id: 2, lat: 14.69744873751683, lng: 121.08948879141845, address: "018 C Kasoy St, Quezon City, 1121 Metro Manila, Philippines"},
    {id: 3, lat: 14.698455087777315, lng: 121.0890975078075, address: "40b Katipunan St, Quezon City, 1121 Metro Manila, Philippines"},
    {id: 4, lat: 14.69846533740118, lng: 121.08870014355143, address: "007 Kasoy St, Quezon City, Metro Manila, Philippines"},
    {id: 5, lat: 14.697932357114198, lng: 121.08841933939966, address: "74 Katuparan, Brgy, Quezon City, Metro Manila, Philippines"},
    {id: 6, lat: 14.696889098918827, lng: 121.0899960887029, address: "70 Katuparan, Quezon City, 1122 Metro Manila, Philippines"},
    {id: 7, lat: 14.696789212523344, lng: 121.08999877091192, address: "70 Katuparan, Quezon City, 1122 Metro Manila, Philippines"},
    {id: 8, lat: 14.699498136952942, lng: 121.09121103548996, address: "6415 1 Bp Road, Quezon City, 1121 Metro Manila, Philippines"},
    {id: 9, lat: 14.69897665786056, lng: 121.09164555335038, address: "6500 Batasan Rd, Quezon City, 1121 Metro Manila, Philippines"},
    {id: 10, lat: 14.69897665786056, lng: 121.09137733244889, address: "082 Kaunlaran, Quezon City, Metro Manila, Philippines"},
];
var polygonArray = [];

patientLocations.sort((a,b) => b.id - a.id);
var counter = patientLocations[0].id;

function initMap() {
    geocoder = new google.maps.Geocoder();

    if(myLatLng.length===0){ 
        myLatLng[0] = {id:1, lat: 14.576368776100365, lng: 121.02620400481982, zoom:11};
    }

    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng[0],
        zoom: myLatLng[0].zoom,
        clickableIcons: false
    });

    var i;
    for(i = 0; i < patientLocations.length; i++){ 
        createMarker(patientLocations[i], patientLocations[i].id);
    }
    printAddress();

    cluster(patientLocations);

    createAreaDropdown();

    if (!google.maps.Polygon.prototype.getBounds) {
        google.maps.Polygon.prototype.getBounds=function(){
            var bounds = new google.maps.LatLngBounds()
            this.getPath().forEach(function(element,index){bounds.extend(element)})
            return bounds;
        }
    }

    var input = document.getElementById('searchInput');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (!place.geometry) {
            window.alert("Autocomplete's returned place contains no geometry");
            return;
        }
  
        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(27);
        }
        counter++;
        createMarker(place.geometry.location, counter);
        getAddress(place.geometry.location.lat(), place.geometry.location.lng(), function(result){
            patientLocations.push({id: counter, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: result});
            removePolygons();
            cluster(patientLocations);
        });
    });
}

//function to print addresses into html
//just call this function to print the addresses after changes
//like after a marker is moved or added or deleted
function printAddress(){
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    patientLocations.sort((a,b) => a.id - b.id);

    var i;
    for(i = 0; i < patientLocations.length; i++){
        var row = table.insertRow(-1); 
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);  

        cell1.innerHTML = patientLocations[i].id;
        cell2.innerHTML = patientLocations[i].address;
    }
}

//function to get address of lat lng

function getAddress(lat, lng, callback) {
    geocoder.geocode({
        latLng: new google.maps.LatLng(lat,lng)
    }, function(responses) {
        if (responses && responses.length > 0) {
            callback(responses[0].formatted_address);
        } else {
            callback("no formatted addresss");
        }
    });
}

//functions for clustering the points

function cluster(points){
    var i;
    var result = [];
    clusterDropdown.innerHTML = '';

    for(i = 0; i < points.length; i++){ // O of n
        var cluster = newCluster(points[i], i);
        result.push(cluster);
    }

    //O of 
    for(i = 0; i < result.length; i++){ // O of n
        var j;
        for(j = 0; j < i; j++){ // O of i
            var length = Math.sqrt(Math.pow((result[j].lng - result[i].lng), 2) + Math.pow((result[j].lat - result[i].lat), 2));
            if(length < 0.00065){
                union(result[i], result[j]); // O(α(n))
            }
        }
    }

    const clusterId = [... new Set(result.map(x => x.parent.rank))];

    for(i = 0; i <clusterId.length; i++){ // O of no. of clusters
        var clusterPoints = result.filter(function(point){ // of of n
            var root = find(point);
            return root.rank == clusterId[i];
        });
        const newHull = convexHull(clusterPoints);  // O of nh
        createHullPolygon(newHull); // O of 1
    }
    drawPolygons();
    createClulsterDropdown();
}

//function for disjoint set data structure

function newCluster(point, rankNum){
    var set = {
        rank: rankNum,
        id: point.id,
        lat: point.lat,
        lng: point.lng
    }
    set.parent = set;
    return set;
}

function find(point){
    if (point.parent !== point){
      point.parent = find(point.parent);
    }
    return point.parent;
}

function union(point1, point2){
    var root1 = find(point1);
    var root2 = find(point2);

    if(root1 !== root2){
        if(root1.rank < root2.rank){
            root2.parent = root1;
        } else {
            root1.parent = root2;
        } 
    } 
}

//function for creating the marker

function createMarker(position, id){
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });

    const infowindow = new google.maps.InfoWindow();

    marker.addListener("click", () => {
        if(removeMode){
            counter--;
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            
            marker.setMap(null);

            printAddress();
            removePolygons();
            cluster(patientLocations);
        } else {
            getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address){
                infowindow.setContent("(" + id + ") " + address);
                infowindow.open(marker.get("map"), marker);
            });
        }  
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address){
            patientLocations[position].address = address;
            infowindow.setContent("(" + id + ") " + address);
            printAddress();
        });
        removePolygons();
        cluster(patientLocations);
    });
}

//functions for google maps polygon

function createHullPolygon(points) {
    var color = "red";
    
    var polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        clickable: false,
    });
    var area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    if(area >= 5000 && area < 20000){
        color = "#eb004e";
    }else if(area >= 20000){
        color = "#a100a1";
    }
    polygon.setOptions({strokeColor: color, fillColor: color});

    polygonArray.push(polygon);
}

function createClulsterDropdown(){
    var i;
    for(i = 0; i < polygonArray.length; i++){
        var id = i + 1;
        var clusterButton = document.createElement("div");

        clusterButton.setAttribute("class", "cluster-dropdown-content");
        clusterButton.setAttribute("onclick", "viewPolygon(" + id + ")");
        clusterButton.innerHTML = "Cluster " + id;
    
        clusterDropdown.append(clusterButton);
    }
}

function viewPolygon(i){
    var bounds = polygonArray[i - 1].getBounds();
    map.fitBounds(bounds, 100);
}

function drawPolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(map);
    }
}

function removePolygons() {
    var i;
    for(i = 0; i < polygonArray.length; i++){
        polygonArray[i].setMap(null);
    }
    polygonArray = [];
}

//functions for convex hull

function convexHull(coordinates){
    const points = coordinates;
    points.sort((a,b) => a.lng - b.lng);
    var start = points[0];
    var result = [];
    var i = 0;

    do {
        result[i] = start;
        var current = result[0];
        var j;
        for(j = 0; j < points.length; j++){
            var checkLeft = isLeft(result[i], current, points[j]);
            if((current == start) || checkLeft){
                current = points[j];
            }
        }
        start = current;
        i++;
    } while (current != result[0])
    return result;
}

function isLeft(a, b, c){
    return result = ((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)) > 0;
}

// functions for area

function setArea(){
    lat = map.getCenter().lat();
    lng = map.getCenter().lng();
    zoom = map.getZoom();
    if(myLatLng.length === 0){
        id = 1;
    } else id = myLatLng[myLatLng.length-1].id + 1;

    const newArea = {id: id, lat: lat, lng: lng, zoom: zoom};

    myLatLng.push(newArea);

    messageStyle.style.display = "block";
    messageStyle.innerHTML = "Successfuly set new area";

    createAreaDropdown()

    //add code to save  mylatlng to a storage
    //para pag niload ni user ang map ay maipapakita ang nakasave na location imbes na kung saan lang
}

function goToArea(i){
    map.panTo(myLatLng[i]);
    map.setZoom(myLatLng[i].zoom);
}

function removeArea(a){
    myLatLng.splice(a, 1);
    createAreaDropdown();
}

function createAreaDropdown() {
    dropdown.innerHTML = "";

    var i;
    for(i = 0; i < myLatLng.length; i++){
        var option = document.createElement("div");
        var remove = document.createElement("div");
        var onclick = "goToArea(" + i + ")";
        var removeFunction = "removeArea(" + i + ")";
        var areaNum = myLatLng[i].id;
        var areaText = document.createTextNode("Area " + areaNum);
        var removeFunctionText = document.createTextNode("X");

        option.setAttribute("class", "dropdown-content");
        option.setAttribute("onclick", onclick);
        option.appendChild(areaText);

        remove.setAttribute("class", "remove-area-button");
        remove.setAttribute("onclick", removeFunction);
        remove.appendChild(removeFunctionText);

        dropdown.append(option);
        dropdown.append(remove);
    }
    var insert = document.createElement("div");
    var insertFunctionText = document.createTextNode("+ New Area");
    
    insert.setAttribute("class", "insert-area-button");
    insert.setAttribute("onclick", "setArea()");
    insert.appendChild(insertFunctionText);

    dropdown.append(insert);
}

//functions for add and remove

function addMarker(){
    if(addMode){
        addMode = false;
        messageStyle.style.display = "none";
        google.maps.event.removeListener(addMarkerEvent);
        return;
    }
    addMode = true;
    removeMode = false;
    
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Add Mode. Click 'Add' again to exit";
    addMarkerEvent = map.addListener("click", (mapsMouseEvent) =>{
        counter++; // index of available space in array or last index

        createMarker(mapsMouseEvent.latLng, counter);

        getAddress(mapsMouseEvent.latLng.lat(), mapsMouseEvent.latLng.lng(), function(address){
            //these codes are inside the callback function
            //because we have to make sure that the geocoding is done before proceeding
            patientLocations.push({id: counter, lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng(), address: address});
            printAddress();

            removePolygons();
            cluster(patientLocations);   
        });
    });
}

function removeMarker(){
    //console.clear()
    if(removeMode){
        removeMode = false;
        messageStyle.style.display = "none";
        return;
    }
    removeMode = true;
    addMode = false;
    google.maps.event.removeListener(addMarkerEvent);
   
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Remove Mode. Click 'Remove' again to exit";
}
