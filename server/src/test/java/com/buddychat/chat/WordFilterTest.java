package com.buddychat.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class WordFilterTest {

    private final WordFilter filter = new WordFilter();

    @Test
    void masksListedWordsWithOneStarPerCharacter() {
        assertThat(filter.mask("fuck")).isEqualTo("****");
        assertThat(filter.mask("Fucking hell, you CUNT.")).isEqualTo("******* hell, you ****.");
        assertThat(filter.mask("just kill   yourself!")).isEqualTo("just ***************!");
        assertThat(filter.mask("야 씨발 진짜")).isEqualTo("야 ** 진짜");
        assertThat(filter.mask("이 개새끼야")).isEqualTo("이 ***야"); // inside a word, with its particle
        assertThat(filter.mask("お前死ねよ")).isEqualTo("お前**よ");
        assertThat(filter.mask("このクソ野郎が")).isEqualTo("この****が");
        assertThat(filter.mask("幹你娘咧")).isEqualTo("***咧");
    }

    @Test
    void leavesEverydayWordsAlone() {
        List<String> harmless = List.of(
                "class",
                "assess the classic Scunthorpe match",
                "fuckaroo is not on the list, nor is pass",
                "Cocktail at the shitake place",
                "시발점부터 다시",
                "뒤돌아 보지 마",
                "아저씨바빠요?",
                "わたしね、殺すとか言わないよ",
                "ガイジンさん",
                "過去死亡人數",
                "手機掰開了",
                "智障人士");
        harmless.forEach(text -> assertThat(filter.mask(text)).isEqualTo(text));
    }

    @Test
    void latinEntriesMatchOnlyWholeWordsAndOthersAnywhere() {
        WordFilter custom = new WordFilter(List.of("# a comment", "", "  ass  ", "バカ"));

        assertThat(custom.mask("Ass! class, assess, glass")).isEqualTo("***! class, assess, glass");
        assertThat(custom.mask("バカだね、おバカさん")).isEqualTo("**だね、お**さん");
        assertThat(new WordFilter(List.of()).mask("anything")).isEqualTo("anything");
    }
}
