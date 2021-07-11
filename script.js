var map;

var removeMode = false;
var addMode = false;
var addMarkerEvent;
var currentCluster = 'none';

var messageStyle = document.getElementById("message");
var table = document.getElementById("MyTable");
var clusterDropdown = document.getElementById("cluster-dropdown");
var dropdown = document.getElementById("dropdown");
var saveMessageBox = document.getElementById("save-message-box");
var saveMessage = document.getElementById("save-message");
var dataBox = document.getElementById("data-box");
var dataContent = document.getElementById("data-content");
var searchInput = document.getElementById("searchInput");
var exportBox = document.getElementById("export");
var canvasContainer = document.getElementById("canvas-container");

var myLatLng = JSON.parse(localStorage.getItem("myLatLng") || "[]");
var patientLocations = JSON.parse(localStorage.getItem("patientLocations") || "[]");
var polygonArray = [];
var clusterArray = [];

patientLocations.sort((a,b) => b.id - a.id);
var counter;
if(!patientLocations[0]) counter = 0; 
else counter = patientLocations[0].id;

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

    cluster();

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
        getAddress(place.geometry.location.lat(), place.geometry.location.lng(), function(result, street, i){
            patientLocations.push({id: counter, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), address: result, street: street});
            cluster();
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

function getAddress(lat, lng, callback, i) {
    i = i || 0;
    geocoder.geocode({
        latLng: new google.maps.LatLng(lat,lng)
    }, function(responses) {
        if (responses && responses.length > 0) {
            if(responses[0].address_components[1].types[0] == "route"){
                var street = responses[0].address_components[1].long_name;
            }
            callback(responses[0].formatted_address, street, i);
        } else {
            callback("no formatted addresss", "no formatted addresss", i);
        }
    });
}

//functions for clustering the points

function cluster(){
    var points = patientLocations;
    var i;
    var result = [];
    clusterDropdown.innerHTML = '';
    clusterArray = [];
    removePolygons();

    for(i = 0; i < points.length; i++){ // O of n
        var cluster = newCluster(points[i], i);
        result.push(cluster);
    }

    //O of 
    for(i = 0; i < result.length; i++){ // O of n
        var j;
        for(j = 0; j < i; j++){ // O of average of n 
            var length = Math.sqrt(Math.pow((result[j].lng - result[i].lng), 2) + Math.pow((result[j].lat - result[i].lat), 2));
            if(length < 0.00065){
                union(result[i], result[j]); // O of amortized n
            }
        }
    }

    var clusterId = [... new Set(result.map(x => x.parent.rank))];

    for(i = 0; i <clusterId.length; i++){ // O of no. of clusters
        var clusterPoints = result.filter(function(point){ // O of n
            var root = find(point); // O of amortized n
            return root.rank == clusterId[i];
        });
        clusterArray.push(clusterPoints); // o of 1
        var newHull = convexHull(clusterPoints);  // O of subset of n that is part of the cluster x hull points .... O(nh) jarvis march
        createHullPolygon(newHull); // O of 1
    }

    if(currentCluster != 'none') displayClusterData(currentCluster);
    drawPolygons();
    createClusterDropdown();
}

//function for disjoint set data structure

function newCluster(point, rankNum){
    var set = {
        rank: rankNum,
        id: point.id,
        lat: point.lat,
        lng: point.lng,
        address: point.address,
        street: point.street
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
    //console.log(position);
    const marker = new google.maps.Marker({
        position: position,
        draggable: true,
        map,
    });

    const infowindow = new google.maps.InfoWindow();

    marker.addListener("click", () => {
        if(removeMode){
            counter--;
            const locationIndex = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(locationIndex, 1);
            
            marker.setMap(null);

            printAddress();
            cluster();
        } else {
            getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address, street, i){
                infowindow.setContent("(" + id + ") " + address);
                infowindow.open(marker.get("map"), marker);
            });
        }  
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        getAddress(marker.getPosition().lat(), marker.getPosition().lng(), function(address, street, i){
            patientLocations[position].address = address;
            patientLocations[position].street = street;
            infowindow.setContent("(" + id + ") " + address);
            printAddress();
        });
        cluster();
    });
}

//functions for google maps polygon

function createHullPolygon(points) {
    var color = "#ff7b1c";
    
    var polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        clickable: false,
    });
    polygonArray.push(polygon);

    var area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    if(area >= 5000 && area < 20000){
        color = "#ff0000";
    }else if(area >= 20000){
        color = "#d90045";
    }

    polygon.setOptions({strokeColor: color, fillColor: color});
}

function displayClusterData(i){
    if(clusterArray[i] === undefined){
        dataBox.style.display = "none";
        return;
    }
    currentCluster = i;
    dataContent.innerHTML = '';
    dataBox.style.display = "block";
    var contentString = '<b>Cluster ' + (i + 1) + '</b><br><br>';

    
    //get number of patients in the cluster
    var patientNum = clusterArray[i].length;
    contentString = contentString + "No. of patients: " + patientNum + "<br>";

    //get area of coresponding polygon
    if(clusterArray[i].length > 2){
        var area = google.maps.geometry.spherical.computeArea(polygonArray[i].getPath());
        area = area.toFixed(2);
        contentString = contentString + "Area: " + area + " sqm <br>";

        //get density people per sq m
        var density = patientNum / area;
        density = density.toFixed(4);
        contentString = contentString + "Density: " + density + " patient per sqm <br>";
    }

    //filter cluster array with non undefined streets
    var validPoints = clusterArray[i].filter(function (point){
        return point.street !== undefined;
    });
    //get street names
    var uniqueStreets = [... new Set(validPoints.map(point => point.street))];

    //display streets
    contentString = contentString + "<br>Affected Streets: " + uniqueStreets.join(', ');

    document.getElementById("data-content").innerHTML = contentString;
    
    getNearestHospitals(clusterArray[i], function(result){
        var container = document.getElementById("nearby-hospital");
        container.innerHTML='';

        for(var i=0; i<result.length; i++){
            hospitalLatLng = {lat: result[i].geometry.location.lat(), lng: result[i].geometry.location.lng()};
            console.log(result[i].geometry.location.lng());

            hospitalName = result[i].name;
            hospitalLocation = result[i].vicinity;

            var hospitalDetails = document.createElement("div");
            hospitalDetails.setAttribute("class", "hospital-details");
            hospitalDetails.setAttribute("onclick", "goToHospital(" + JSON.stringify(hospitalLatLng) + ")");

            var hospitalNameDiv = document.createElement("div");
            hospitalNameDiv.setAttribute("class", "hospital-name");
            hospitalNameDiv.innerHTML = hospitalName;     
            
            var hospitalLocationDiv = document.createElement("div");
            hospitalLocationDiv.setAttribute("class", "hospital-location");
            hospitalLocationDiv.innerHTML = hospitalLocation;

            hospitalDetails.append(hospitalNameDiv);
            hospitalDetails.append(hospitalLocationDiv);

            container.append(hospitalDetails);
        }
    });
}

function goToHospital(latLng){
    map.panTo(latLng);
    map.setZoom(20);
}
function getNearestHospitals(points, callback){
    var hospitals = [];

    var center = getCenter(points);
    
    service = new google.maps.places.PlacesService(map);

    service.nearbySearch({
        location: center,
        radius: '1000',
        type: ['hospital']
    }, function(result, status){
        if(status == google.maps.places.PlacesServiceStatus.OK){
            for(var i=0; i < 5; i++){
                if(result[i] !== undefined){
                    hospitals.push(result[i]);
                }
            }
            callback(hospitals);
        }
    });
}

function getCenter(points){
    var latAverage = points.reduce((a, b) => a + b.lat, 0) / points.length;
    var lngAverage = points.reduce((a, b) => a + b.lng, 0) / points.length;
    return {lat: latAverage, lng: lngAverage};
}

function closeData(){
    dataBox.style.display = "none";
    currentCluster = 'none';
}

function createClusterDropdown(){
    var i;
    for(i = 0; i < clusterArray.length; i++){
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

    displayClusterData(i - 1);
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
        searchInput.style.display = "none";
        messageStyle.style.display = "none";
        google.maps.event.removeListener(addMarkerEvent);
        return;
    }
    addMode = true;
    removeMode = false;
    
    searchInput.style.display = "flex";
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Add Mode. Click 'Add' again to exit";
    addMarkerEvent = map.addListener("click", (mapsMouseEvent) =>{
        counter++; // index of available space in array or last index

        createMarker({lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng()}, counter);
        
        patientLocations.push({id: counter, lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng()});

        cluster();  

        getAddress(mapsMouseEvent.latLng.lat(), mapsMouseEvent.latLng.lng(), function(address, street, i){
            //these codes are inside the callback function
            //because we have to make sure that the geocoding is done before proceeding
            patientLocations[i-1].address = address;
            patientLocations[i-1].street = street;
            printAddress(); 
        }, counter);
    });
}

function removeMarker(){
    if(removeMode){
        removeMode = false;
        messageStyle.style.display = "none";
        return;
    }
    removeMode = true;
    addMode = false;
    google.maps.event.removeListener(addMarkerEvent);
   
    searchInput.style.display = "none";
    messageStyle.style.display = "block";
    messageStyle.innerHTML = "You are in Remove Mode. Click 'Remove' again to exit";
}

//function to save data

function saveData(){
    localStorage.setItem("patientLocations", JSON.stringify(patientLocations));
    localStorage.setItem("myLatLng", JSON.stringify(myLatLng));

    saveMessageBox.style.display = "flex";
    saveMessage.innerHTML = "Your progress has been saved.";
}

function closeSaveMessage(){
    var saveMessageBox = document.getElementById("save-message-box");
    saveMessageBox.style.display = "none";
}

function saveImage(){
    window.scrollTo(0,0);

    canvasContainer.innerHTML = '';
    exportBox.style.display = "block";

    html2canvas(document.getElementById("map-container"),{
        scrollY: 80,
        useCORS: true
    }).then(canvas =>{
        canvas.style.height = "auto";
        canvas.style.width = "700px";
        canvasContainer.appendChild(canvas);
    });
}

function closeExportBox(){
    exportBox.style.display = "none";
}
