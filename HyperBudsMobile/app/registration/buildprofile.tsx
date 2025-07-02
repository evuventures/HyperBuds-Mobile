import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

const { width } = Dimensions.get('window');

const categoriesData = {
  Creator: [
    'Audio: Podcasting, ASMR',
    'Writing: Blogging, Copywriting',
    'Social Media: Instagram Influencer, TikTok Creator',
    'Lifestyle: Beauty, Fitness',
    'Education: Online Courses, Tutorials',
  ],
  Artist: ['Sample text 1', 'Sample text 2'],
  Developer: ['Sample text 1', 'Sample text 2'],
  Educator: ['Sample text 1', 'Sample text 2'],
  'Social Connection': ['Sample text 1', 'Sample text 2'],
};

export default function BuildProfileScreen() {
  const swiperRef = useRef<Swiper>(null);
  const currentIndex = useRef(0);
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<{ [key: string]: string[] }>({});

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
      // if a subcategory is selected, make sure the category is selected
      if (!selectedCategories.includes(category)) {
        setSelectedCategories((prev) => [...prev, category]);
      }
    }

    setSelectedSubcategories((prev) => ({
      ...prev,
      [category]: updated,
    }));
  };

  const handleContinue = () => {
    swiperRef.current?.scrollBy(1, true);
  };

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        if (currentIndex.current === 0) {
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
    <Swiper
      ref={swiperRef}
      loop={false}
      showsPagination={true}
      dotColor="#ccc"
      activeDotColor="#A855F7"
      scrollEnabled={false}
      onIndexChanged={(index) => (currentIndex.current = index)}
      paginationStyle={{ top: -540 }}
    >
      {/* Slide 1 */}
      <View style={styles.container}>
        {renderBackButton()}
        <TouchableOpacity style={styles.avatarContainer}>
          <Image source={require('../../assets/images/avatar.png')} style={styles.avatar} />
          <Image source={require('../../assets/images/edit.png')} style={styles.editIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Build Your Profile</Text>
        <Text style={styles.label}>Short Bio (optional)</Text>
        <TextInput
          multiline
          numberOfLines={4}
          placeholder="Write a short bio..."
          placeholderTextColor="#888"
          style={styles.textArea}
        />
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Slide 2 - Choose Niche */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {renderBackButton()}
        <Text style={styles.title}>Choose Your Niche</Text>
        <Text style={styles.subtext}>
          Select your primary category and related sub-niches that best describe your field or interest
        </Text>

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
              <Text
                onPress={() => toggleCategory(category)}
                style={styles.categoryText}
              >
                {category}
              </Text>
              <AntDesign
                name={expandedCategories.includes(category) ? 'up' : 'down'}
                size={18}
                color="#666"
              />

            </TouchableOpacity>

            {expandedCategories.includes(category) && (
              <View style={styles.subCategoryContainer}>
                {subs.map((sub, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.subCategoryBox}
                    onPress={() => toggleSubcategory(category, sub)}
                  >
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
          <LinearGradient
            colors={['#3B82F6', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Slide 3 - Placeholder */}
      <View style={styles.container}>
        {renderBackButton()}
        <Text style={styles.placeholderText}>Slide 3</Text>
      </View>
    </Swiper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 120,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    borderRadius: 60,
  },
  editIcon: {
    position: 'absolute',
    bottom: 13,
    right: 11,
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9333EA',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  subtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
  },
  textArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    marginBottom: 30,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 30,
    alignSelf: 'center',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 20,
    color: '#999',
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  categoryBox: {
    width: '100%',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  categoryText: {
    flex: 1,
    color: '#9333EA',
    fontSize: 16,
    fontWeight: '500',
  },
  subCategoryContainer: {
    paddingBottom: 10,
    gap: 10,
  },
  subCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 4,
  },
  subCategoryText: {
    fontSize: 14,
    color: '#444',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    width: 10,
    height: 10,
    backgroundColor: '#9333EA',
    borderRadius: 2,
  },
  iconWrapper: {
    padding: 6,
  },
});
