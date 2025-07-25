import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Swiper from 'react-native-swiper';
export default function BuildProfileScreen() {
const { width } = Dimensions.get('window');

const categoriesData = {
  Creator: [
    'Audio: Podcasting, ASMR',
    'Writing: Blogging, Copywriting',
    'Social Media: Instagram Influencer, TikTok Creator',
    'Lifestyle: Beauty, Fitness',
    'Education: Online Courses, Tutorials',
  ],
  Artist: ['Music: Songwriting, Vocalist', 
    'Graphic Design: Branding, UI/UX Design',
     "Performing Artist:, Acting Dance",
     "Crafts: Knitting/Crochet",
    ],

  Developer: ['Web Development', 
    'Game development', 
    'Data Science/AI: Machine Learning, Data Analysis',
    'Blockchain/Web3: Smart Contracts, DeFi, NFTs', 
    'Cybersecurity, Devops/clouds'],
  Educator: ['Elementary School, Middle School, High School',
     'Higher Education: College/University Professors, Teaching Assistants',
    'Instructional Specialist, Support Educators',
    'Lecurers, Mentors, Facilataters,      Online Tutors '],
  'Social Connection': ['General Freindship',
     ' Porfessional Networking,          Mentorship (seeking/offering)',
    'Shared Hobbies: Books, Clubs,     Hiking Groups'],
  
};

const purposeOptions = [
  { key: 'collab', label: 'Collaborate with Others', icon: require('../../assets/images/collab.png') },
  { key: 'learn', label: 'Learn New Skills with AI Assistance', icon: require('../../assets/images/learn.png') },
  { key: 'friends', label: 'Meet New Friends', icon: require('../../assets/images/friends.png') },
  { key: 'brainstorm', label: 'Use AI to Brainstorm / Co-create', icon: require('../../assets/images/AI.png') },
  { key: 'feedback', label: 'Get Feedback on my Work', icon: require('../../assets/images/feedback.png') },
  { key: 'idea', label: 'Build or Pitch an Idea with Others', icon: require('../../assets/images/idea.png') },
  { key: 'monetize', label: 'Monetize my Content or Services', icon: require('../../assets/images/money.png') },
  { key: 'livestream', label: 'Livestream Using AI Tools', icon: require('../../assets/images/live.png') },
  { key: 'other', label: 'Other / Unsure', icon: require('../../assets/images/question.png') },
];

const collabTypes = [
  { key: 'duet', label: 'Live Duet', icon: require('../../assets/images/duet.png') },
  { key: 'podcast', label: 'Podcast', icon: require('../../assets/images/podcast.png') },
  { key: 'interview', label: 'Interview', icon: require('../../assets/images/interview.png') },
];

const [socials, setSocials] = useState([
  { key: 'instagram', label: 'Instagram', icon: require('../../assets/images/ig.png') },
  { key: 'tiktok', label: 'TikTok', icon: require('../../assets/images/tiktok.png') },
  { key: 'youtube', label: 'YouTube', icon: require('../../assets/images/yt.png') },
  { key: 'snapchat', label: 'Snapchat', icon: require('../../assets/images/snap.png') },
  { key: 'twitter', label: 'Twitter', icon: require('../../assets/images/twitter.png') },
  { key: 'facebook', label: 'Facebook', icon: require('../../assets/images/fb.png') },
]);


  const [avatar, setAvatar] = useState<string | null>(null); 
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<{ [key: string]: string[] }>({});
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
  

  const togglePurpose = (key: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCollab = (key: string) => {
    setSelectedCollabs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((item) => item !== category));
      setSelectedSubcategories((prev) => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
    } else {
      setSelectedCategories((prev) => [...prev, category]);
    }
  };

  const toggleSubcategory = (category: string, sub: string) => {
    const existing = selectedSubcategories[category] || [];
    let updated: string[];
    if (existing.includes(sub)) {
      updated = existing.filter((s) => s !== sub);
    } else {
      updated = [...existing, sub];
      if (!selectedCategories.includes(category)) {
        setSelectedCategories((prev) => [...prev, category]);
      }
    }
    setSelectedSubcategories((prev) => ({
      ...prev,
      [category]: updated,
    }));
  };
//add image
const pickImage = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    alert('Permission to access camera roll is required!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (!result.canceled) {
    setAvatar(result.assets[0].uri);
  }
};

  const handleContinue = () => {
    swiperRef.current?.scrollBy(1, true);
  };

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        if (currentIndex === 0) {
          router.back();
        } else {
          swiperRef.current?.scrollBy(-1);
        }
      }}
    >
      <AntDesign name="arrowleft" size={24} color="#333" />
    </TouchableOpacity>
    
    
  );

  return (
    <View style={{ flex: 1 }}>
  {/* Top fixed white bar */}
  <View style={styles.topBar}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        if (currentIndex === 0) {
          router.back();
        } else {
          swiperRef.current?.scrollBy(-1);
        }
      }}
    >
      <AntDesign name="arrowleft" size={24} color="#333" />
    </TouchableOpacity>

    <View style={styles.dots}>
      {[0, 1, 2, 3, 4, 5].map((_, i) => (
        <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
      ))}
    </View>
  </View>

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        scrollEnabled={false}
        onIndexChanged={(index) => setCurrentIndex(index)}
      >
        {/* Slide 1 */}
        <View style={styles.container}>
          
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            <Image
              source={avatar ? { uri: avatar } : require('../../assets/images/avatar.png')}
              style={styles.avatar}
            />
            <Image source={require('../../assets/images/edit.png')} style={styles.editIcon} />
          </TouchableOpacity>
          <Text style={styles.title}>Build Your Profile</Text>
          <Text style={styles.label}>Short Bio </Text>
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Write a short bio..."
            placeholderTextColor="#888"
            style={styles.textArea}
          />
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Slide 2 */}
        <ScrollView contentContainerStyle={[styles.container, { alignItems: 'stretch' }]} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.title}>Choose Your Niche</Text>
          <Text style={styles.subtext}>Select your primary category and related sub-niches that best describe your field or interest</Text>
          {Object.entries(categoriesData).map(([category, subs]) => (
            <View key={category} style={styles.categoryBox}>
              <TouchableOpacity
                onPress={() => {
                  if (expandedCategories.includes(category)) {
                    setExpandedCategories(expandedCategories.filter(c => c !== category));
                  } else {
                    setExpandedCategories([...expandedCategories, category]);
                  }
                }}
                style={styles.categoryHeader}
              >
                <TouchableOpacity onPress={() => toggleCategory(category)}>
                  <View style={styles.checkbox}>
                    {selectedCategories.includes(category) && <View style={styles.checkboxSelected} />}
                  </View>
                </TouchableOpacity>
                <Text onPress={() => toggleCategory(category)} style={styles.categoryText}>{category}</Text>
                <AntDesign name={expandedCategories.includes(category) ? 'up' : 'down'} size={18} color="#666" />
              </TouchableOpacity>
              {expandedCategories.includes(category) && (
                <View style={styles.subCategoryContainer}>
                  {subs.map((sub, index) => (
                    <TouchableOpacity key={index} style={styles.subCategoryBox} onPress={() => toggleSubcategory(category, sub)}>
                      <View style={styles.checkbox}>
                        {selectedSubcategories[category]?.includes(sub) && <View style={styles.checkboxSelected} />}
                      </View>
                      <Text style={styles.subCategoryText}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Slide 3 */}
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.title}>Purpose of{"\n"}Using Platform</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: -50 }}>
            {purposeOptions.map((item) => (
              <TouchableOpacity
              key={item.key}
              onPress={() => togglePurpose(item.key)}
              style={[styles.purposeCard, selectedPurposes.includes(item.key) && styles.cardSelected]}
            >
              <View style={styles.cardCheckboxWrapper}>
                <View style={styles.checkbox}>
                  {selectedPurposes.includes(item.key) && <AntDesign name="check" size={12} color="#000" />}
                </View>
              </View>
            
              <Image source={item.icon} style={styles.purposeIcon} />
              <Text style={styles.purposeText}>{item.label}</Text>
            </TouchableOpacity>
            
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

          <View style={styles.container}>
          
          <Text style={styles.title}>Preferred{"\n"}Collab Types</Text>
          <View style={styles.collabContainer}>
            {collabTypes.map((item) => (
              
              <TouchableOpacity
                key={item.key}
                onPress={() => toggleCollab(item.key)}
                style={[styles.collabCard, selectedCollabs.includes(item.key) && styles.cardSelected]}
              >
                <View style={styles.collabCheckboxWrapper}>
                  <View style={styles.checkbox}>
                    {selectedCollabs.includes(item.key) && <AntDesign name="check" size={12} color="#000" />}
                  </View>
                </View>
                <Image source={item.icon} style={styles.purposeIcon} />
                <Text style={styles.purposeText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
{/* Slide 5 - Connect Socials */}
<ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
  
  <Text style={styles.title}>Connect your{"\n"}Socials</Text>

  <View style={{ width: '100%', gap: 12, marginTop: 20 }}>
    {socials.map((item) => (
      <TouchableOpacity
        key={item.key}
        style={styles.socialRow}
        onPress={() => {
          // Add logic to open a link or input here if needed
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={item.icon} style={styles.socialIcon} />
          <Text style={styles.socialLabel}>{item.label}</Text>
        </View>
        <AntDesign name="link" size={18} color="#444" />
      </TouchableOpacity>
    ))}
  </View>

  <TouchableOpacity style={styles.button} onPress={handleContinue}>
    <LinearGradient colors={['#3B82F6', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
      <Text style={styles.buttonText}>Continue</Text>
    </LinearGradient>
  </TouchableOpacity>
</ScrollView>


{/* Slide 6 - Registration Complete */}
<View style={styles.container}>
  
  <Text style={styles.title}>Registration{"\n"}complete</Text>

  <Image
    source={require('../../assets/images/check.png')}
    style={styles.checkIcon}
  />

  <Text style={styles.completeText}>Thank you for{"\n"}registering!</Text>

  <TouchableOpacity style={styles.button} onPress={() => router.replace('/main/explore')}>
    <LinearGradient
      colors={['#3B82F6', '#9333EA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <Text style={styles.buttonText}>Start</Text>
    </LinearGradient>
  </TouchableOpacity>
</View>
       
        
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 20, paddingTop: 35, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 30 },
  avatar: { width: 120, height: 120, resizeMode: 'contain', borderRadius: 60 },
  editIcon: { position: 'absolute', bottom: 13, right: 11, width: 24, height: 24, resizeMode: 'contain' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#9333EA', marginBottom: 20, textAlign: 'center' },
  label: { alignSelf: 'flex-start', fontSize: 14, marginBottom: 6, color: '#333' },
  subtext: { textAlign: 'center', fontSize: 14, color: '#333', marginBottom: 20 },
  textArea: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, minHeight: 100, marginBottom: 30, textAlignVertical: 'top' },
  button: { borderRadius: 10, overflow: 'hidden', marginTop: 30, alignSelf: 'center' },
  gradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: 'center', borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  placeholderText: { fontSize: 20, color: '#999', marginBottom: 20 },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 10,
    zIndex: 10,
    padding: 20,
  },
  
  
  categoryBox: { width: '100%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  categoryText: { flex: 1, color: '#9333EA', fontSize: 16, fontWeight: '500' },
  subCategoryContainer: { paddingBottom: 10, gap: 10 },
  subCategoryBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginVertical: 4 },
  subCategoryText: { fontSize: 14, color: '#444' },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#aaa', backgroundColor: '#fff', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { width: 10, height: 10, backgroundColor: '#9333EA', borderRadius: 2 },
  //dots: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', zIndex: 99, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc' },
  activeDot: { backgroundColor: '#A855F7' },
  purposeCard: { width: '47%', aspectRatio: 1, borderWidth: 1, borderColor: '#aaa', borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15, position: 'relative' },
  purposeIcon: { width: 40, height: 40, marginBottom: 10, resizeMode: 'contain' },
  purposeText: { fontSize: 12, textAlign: 'center', color: '#000' },
  cardSelected: { borderColor: '#9333EA', borderWidth: 2 },
  
  collabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 30,
  },
  collabCard: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  collabCheckboxWrapper: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  socialRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  socialIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  socialLabel: {
    fontSize: 15,
    color: '#000',
  },
  checkIcon: {
    width: 100,
    height: 100,
    marginVertical: 30,
    resizeMode: 'contain',
  },
  completeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
    marginBottom: 40,
  },
  topBar: {
    backgroundColor: '#fff',
    height: 60, // makes the bar bigger/ smaller
    paddingTop: 25,
    paddingHorizontal: 20,
    justifyContent: 'center', // <-- center content
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 999,
    position: 'relative',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  purposeCardCheckboxWrapper: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  cardCheckboxWrapper: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },

});
