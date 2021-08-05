// your account_id
const accountId = 'carto.NVYBik'
//  your map_id
const mapId = 'NxpJokfIoI'
// map configuration
const options = {
    container: 'map',
    center: [18.99562398147583, 50.12318916316701],
    zoom: 12.5
};

//map authenticator
const authenticator = window.opalSdk.MapAuthenticator.fromUrl(
    `https://map.nmaps.pl/${accountId}/${mapId}`
)

//map instance
let mapApi;

//variables for filtration
let tempData;
let tempDataset;

//icons, Icons made by Freepik from www.flaticon.com
const icons = [
    {path: 'icons/restauracja.png', id: 'restauracja'},
    {path: 'icons/fastfood.png', id: 'fastfood'},
    {path: 'icons/orientalna.png', id: 'orientalna'},
    {path: 'icons/kebab.png', id: 'kebab'},
    {path: 'icons/pizza.png', id: 'pizza'},
    {path: 'icons/wloska.png', id: 'wloska'},
    {path: 'icons/kawiarnia.png', id: 'kawiarnia'},
    {path: 'icons/pierogi.png', id: 'pierogi'},
    {path: 'icons/nalesniki.png', id: 'nalesniki'},
];

//funtions to fetch files
function fetchJSON(path) {
    return new Promise((resolve) => {
        fetch(path)
            .then(response => resolve(response.json()))
    });
}

function fetchIMG(path) {
    return new Promise((resolve) => {
        fetch(path)
            .then(response => response.arrayBuffer())
            .then(data => {
                const blob = new window.Blob([new Uint8Array(data)], {
                    type: 'image/png',
                });
                resolve(window.createImageBitmap(blob));
            });
    });
}

//getting data from json files
const restaurantIcons = new Promise((resolve) => {
    Promise.all(
        icons.map(img => new Promise((resolve) => {
            fetchIMG(img.path)
                .then(image => {
                    return {
                    'data': image,
                    'id': img.id
                    }
                })
            .then(resolve)
        }))
    ).then(resolve)
});

const restaurants =
    fetchJSON('data/restauracje.geojson')
        .then(data => {
            tempData=data;
            return window.opalSdk.createDataset('restauracje', {
                data: data,
                cluster: true,
                clusterRadius: 70
    })
});

const borders =
    fetchJSON('data/map.geojson')
        .then(data => {
            return window.opalSdk.createDataset('granice', {
            data: data,
        });
});

//called when map api is succesfully created
function onCreate(map) {
    mapApi = map
}

//navigation buttons
document.getElementById('homePosition').addEventListener('click',() => {
    mapApi.flyTo({
        center: options.center,
        zoom: options.zoom,
        bearing: 0,
        pitch: 0
    })
})

document.getElementById('zoomIn').addEventListener('click',() => {
    mapApi.flyTo({
        zoom: mapApi.zoom+1
    })
})

document.getElementById('zoomOut').addEventListener('click',() => {
    mapApi.flyTo({
        zoom: mapApi.zoom-1
    })
})

document.getElementById('homeBearing').addEventListener('click',() => {
    mapApi.flyTo({
        bearing: 0,
        pitch: 0
    })
})

//legend button
const legendSize="585px"
const legend = document.querySelector('.legend');
document.getElementById('legendButton').addEventListener('click',() => {
    if(legend.style.height===legendSize)
    {
        legend.style.height="0px";
        document.getElementById('legendText').innerHTML="Pokaż legendę";
    }
    else
    {
        legend.style.height=legendSize;
        document.getElementById('legendText').innerHTML="Schowaj legendę";
    }
})

//actions on clicking menu buttons - filtration
let filter = {
    "restauracja":1, 
    "fastfood":1,
    "orientalna":1,
    "kebab":1, 
    "pizza":1,
    "wloska":1,
    "kawiarnia":1, 
    "pierogi":1,
    "nalesniki":1
}

let menuButtons = document.querySelectorAll('.menuButton');
menuButtons.forEach(button => {
    button.addEventListener('click', () => {
        if(button.value==="1") {
            button.value="0";
            button.style.opacity=0.5;
            document.getElementById(`${button.id}Span`).style.opacity=0.5;
            document.getElementById(`${button.id}Span`).style.textDecoration = "line-through";
        }
        else {
            button.value="1";
            button.style.opacity=1;
            document.getElementById(`${button.id}Span`).style.opacity=1;
            document.getElementById(`${button.id}Span`).style.textDecoration = "none";
        }

        let filterData = {
            "type": "FeatureCollection",
                "features": []
        };
        
        filter[button.id]=!filter[button.id];

        for(let i=0; i<tempData.features.length; i++) {
            for(let element in filter) {
                if(filter[element] && tempData.features[i].properties.type===element) {
                    filterData.features.push(tempData.features[i]);
                    break;
                }
            }
        }
        
        tempDataset.setData(filterData);
    })
})

//function to create map
function createMap() {
    window.opalSdk
    .createMap(authenticator, options)
    .then(onCreate)
    .then(onMapCreation)
    .catch(e => console.error('Oups', e.message));
}

//function that performs all actions on creating map
function onMapCreation() { 
    let popup, popupValue, popupCoords;
    //here we are waiting until map style is loaded, then we can add our layer
    mapApi.event$.subscribe((event) => {
        if (event.type === 'load') {
            borders
                .then(dataset => {
                    mapApi.addData(dataset, {
                        id: 'polygon',
                        type: 'fill',
                        paint: {
                          'fill-color': '#0090e3',
                          'fill-opacity': 0.2
                        }
                    })
                    mapApi.addData(dataset, {
                        id: 'line',
                        type: 'line',
                        paint: {
                          'line-color': '#0090e3',
                          'line-width': 3
                        }
                        
                      })
                })
            restaurantIcons
                .then(images => images.forEach((image) => {
                    mapApi.images().add(image.id, image.data,{ 'image': true})
                }))
                .then(() => {
                    restaurants
                        .then(dataset => {
                            tempDataset=dataset;
                            mapApi.addData(dataset, {
                                id: 'restauracje_clusters',
                                type: 'circle',
                                filter: ['all', ['has', 'point_count'] ],
                                paint: {
                                    'circle-color': [
                                        'step',
                                        ['get', 'point_count'],
                                        // This color is defined for clusters with 5 points or less
                                        '#296e19',
                                        5,
                                        // This color is defined for clusters with 10 points or less
                                        '#4034eb',
                                        10,
                                        // This color is defined for clusters with any other amount of points (default)
                                        '#b82b24',
                                        ],
                                    'circle-radius': [
                                        'step',
                                        ['get', 'point_count'],
                                        // This radius is defined for clusters with 5 points or less
                                        22,
                                        5,
                                        // This radius is defined for clusters with 10 points or less
                                        26,
                                        10,
                                        // This radius is defined for clusters with any other amount of points (default)
                                        30
                                        ],
                                    'circle-stroke-width': 0
                                }
                            });
                        
                            mapApi.addData(dataset, {
                                id: 'restauracje_cluster-count',
                                type: 'symbol',
                                filter: ['all', ['has', 'point_count'], ],
                                layout: {
                                    'text-field': '{point_count_abbreviated}',
                                    'text-font': ['Roboto Bold'],
                                    'text-size': 14,
                                    'text-offset': [0, 0.15],
                                },
                                paint: {
                                    'text-color': '#ffffff',
                                },
                            });
                            
                            mapApi.addData(dataset, {
                                id: 'restauracje',
                                type: 'symbol',
                                filter: ['all', ['!', ['has', 'point_count']]],
                                layout: {
                                    'icon-allow-overlap': true,
                                    'icon-image': ['get', 'type'],
                                    'icon-size': 0.05,
                                    // The text-field depends on feature property('type').
                                    'text-field': ['get', 'name'],
                                    'text-font': [
                                      'Roboto Black',
                                      'Arial Unicode MS Bold'
                                    ],
                                    'text-offset': [0, 1.30],
                                    'text-anchor': 'top',
                                    "text-size": 13
                                },
                                paint: {
                                    "text-color": "#2f496b",
                                }
                            });
                        });
                });

            //adding scale control
            //scaleControl position: 
            //'top-left', 'top-right', 'bottom-left', 'bottom-right' 
            mapApi.controls().add('ScaleControl', {
                maxWidth: 150,
                unit: 'metric'
            }, 'bottom-right');

            //hiding default icons
            mapApi.layer('poi_z14').hide();
            mapApi.layer('poi_z15').hide();
            mapApi.layer('poi_z16').hide();
            
        }

        //actions on click on icon
        if (event.type === 'click') {
            const coords = event.data.point;
            const layers = ['restauracje'];
            const target = mapApi.query(coords, {layers});
            if (target.length >= 1) {
                if (popupCoords != target[0].geometry.coordinates) {
                    if (popup) { popup.remove() }
                    popupCoords = target[0].geometry.coordinates;
                    popupValue = `
                    <ul style="list-style: none;
                        display: flex;
                        flex-direction: column;
                        align-items: right;
                        margin: 5px 5px 0 -35px;">
                        <li>${target[0].properties.name}</li>
                        <li>${target[0].properties.address}</li>
                        <li>${target[0].properties.number}</li>
                        <li><a style="text-decoration: none" 
                            href="${target[0].properties.link}" 
                            target="blank">${target[0].properties.link}
                        </a></li>
                        <li>Godziny otwarcia: 
                        <br>
                            ${target[0].properties.opHours.replaceAll(",","<br>")}
                        </li>
                    </ul>`;
                    popupValue ?
                    (popup = window.opalSdk
                        .createPopup({
                            closeButton: false,
                            closeOnClick: false
                        })
                        .setLngLat(popupCoords)
                        .setHTML(
                            `<div style="font-size: 14px;
                            font-weight: 550; min-height: 10px; 
                            height: auto; min-width: 10px; width:auto;
                            color: #2f496b; overflow-wrap: break-word;">
                            ${popupValue}</div>`
                        )) :
                    (popupValue = null);
        
                    mapApi.addPopup(popup);
                } 
            } 
            else if (target.length === 0) {
      
                if (popup || popupValue) {
                    popup.remove();
                    popup = null;
                    popupValue = null
                } 
            } 
        }

        //action on mousemove
        if (event.type === 'mousemove') {
            let pixels=3;
            const layers = ['restauracje']
            const {
                x,
                y
            } = event.data.point
    
            const iconCoords = [
                [x + pixels, y + pixels],
                [x - pixels, y - pixels]
            ]
            const target = mapApi.query(iconCoords, {
                layers
            })
    
            if (target.length >= 1) {
                mapApi.canvas.style.cursor = 'pointer'
            } 
            else if (target.length === 0) {
                mapApi.canvas.style.cursor = 'default'
            }
        } 
    })
}

//creating a map
createMap();